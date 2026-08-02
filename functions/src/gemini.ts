import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getAuth } from 'firebase-admin/auth'
import { getAppCheck } from 'firebase-admin/app-check'
import { createHash } from 'node:crypto'
import { underRateLimit, RATE_LIMIT, RATE_LIMIT_GUEST } from './ratelimit'
import { underDailyCap, underChatCap, isPremium, DAILY_SOLVES_GUEST, DAILY_SOLVES_USER, DAILY_CHAT_PER_PROBLEM } from './dailycap'

/**
 * Authenticated proxy in front of the Gemini API.
 *
 * The app never talks to Google directly and never carries the API key: it
 * sends requests here with the user's Firebase ID token, we verify the token,
 * then forward the request to Gemini with the server-held key and stream the
 * response straight back. The path mirrors Gemini's REST shape
 * (/models/<model>:generateContent | :streamGenerateContent), so the client's
 * Gemini code works unchanged with baseUrl pointed at this function.
 */

// Set once with: firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

// Models are whitelisted server-side: the app can pick between these two,
// and a stolen client still can't run anything pricier. PINNED ids only —
// the `-latest` aliases were dropped 2026-07-15 (no public installs yet):
// an alias hot-swap once put verification on a ~45s/check model, so nothing
// unpinned is ever reachable again.
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite'
const ALLOWED_MODELS = new Set([
  DEFAULT_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
])
const THINKING_LEVELS = new Set(['minimal', 'low', 'medium', 'high'])
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta'

type RequestPurpose = 'solve' | 'verify' | 'followup' | 'read'

type PromptContract = {
  purposes: RequestPurpose[]
  maxOutputTokens: number
  allowsCodeExecution?: boolean
  requiresImage?: boolean
}

/**
 * Hashes of the exact reviewed system prompts shipped by the app. The proxy
 * refuses every other system instruction, so a modified client cannot turn
 * the paid endpoint into a general-purpose Gemini relay. A prompt change must
 * therefore be reviewed and deliberately registered here before deployment.
 */
const PROMPT_CONTRACTS = new Map<string, PromptContract>([
  ['cc44622bb87f2999caa42eabdfac4a68f736c43d9698469bb61b6af615df3e23', { purposes: ['solve'], maxOutputTokens: 4096 }],
  ['f9648c381eed697e18a4b6c32d6a5a9d4be601c81adba3fc38a14e9f7c6f732b', { purposes: ['followup'], maxOutputTokens: 1500 }],
  ['240cdeebe63b97f546a09dfb43a9a7b847d1f16bf2a88ae5babaf6270325c689', { purposes: ['followup'], maxOutputTokens: 900 }],
  ['5266be9a8ce30d25f946f5dcc56f80e19b34dd939d9bc2765ad07fbc71a5de74', { purposes: ['followup'], maxOutputTokens: 500 }],
  ['413315d9eb29e8d3fabfb82e8b13ae4b1edc00fbff58e1207d53606a4f5dd81c', { purposes: ['solve'], maxOutputTokens: 700 }],
  ['b5fc80f85738495d788728d46c65c489ee940c27bd21a50fa64c20bcee0c5f7c', { purposes: ['read'], maxOutputTokens: 1400, requiresImage: true }],
  ['89e903c35aaa42eb93faa55bdeab3dd8e31547cfb3cebc1c6d634aa738890a21', { purposes: ['solve'], maxOutputTokens: 1200 }],
  ['dc3a1d7ae01e3132006dbc3c8a663cdf82291c72efe44397073ceed0ce0196e6', { purposes: ['verify'], maxOutputTokens: 4096, allowsCodeExecution: true }],
  ['daf4dce3c265e8111f16d751f8eacf64b01baf1b6296bd73ad8f9d5095fd085f', { purposes: ['solve'], maxOutputTokens: 1800 }],
])

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function readSystemPrompt(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const parts = (value as { parts?: unknown }).parts
  if (!Array.isArray(parts) || parts.length !== 1) return null
  const text = (parts[0] as { text?: unknown } | undefined)?.text
  return typeof text === 'string' && text.length <= 12_000 ? text : null
}

function findPromptContract(systemPrompt: string, purpose: RequestPurpose): PromptContract | null {
  const hash = createHash('sha256').update(systemPrompt, 'utf8').digest('hex')
  const contract = PROMPT_CONTRACTS.get(hash)
  return contract?.purposes.includes(purpose) ? contract : null
}

/** Rebuild the Gemini conversation from a deliberately small schema. */
function sanitizeContents(value: unknown): { contents: Array<Record<string, unknown>>; hasImage: boolean } | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) return null

  let textLength = 0
  let imageLength = 0
  let hasImage = false
  const contents: Array<Record<string, unknown>> = []

  for (const rawContent of value) {
    if (!rawContent || typeof rawContent !== 'object') return null
    const role = (rawContent as { role?: unknown }).role
    const rawParts = (rawContent as { parts?: unknown }).parts
    if ((role !== 'user' && role !== 'model') || !Array.isArray(rawParts) || rawParts.length < 1 || rawParts.length > 3) {
      return null
    }

    const parts: Array<Record<string, unknown>> = []
    for (const rawPart of rawParts) {
      if (!rawPart || typeof rawPart !== 'object') return null
      const part = rawPart as { text?: unknown; inlineData?: unknown }
      if (typeof part.text === 'string') {
        if (!part.text.length || part.text.length > 20_000) return null
        textLength += part.text.length
        parts.push({ text: part.text })
        continue
      }
      if (part.inlineData && typeof part.inlineData === 'object') {
        const inline = part.inlineData as { mimeType?: unknown; data?: unknown }
        if (
          typeof inline.mimeType !== 'string' || !IMAGE_MIME_TYPES.has(inline.mimeType) ||
          typeof inline.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(inline.data)
        ) return null
        imageLength += inline.data.length
        hasImage = true
        parts.push({ inlineData: { mimeType: inline.mimeType, data: inline.data } })
        continue
      }
      return null
    }
    contents.push({ role, parts })
  }

  if (textLength > 60_000 || imageLength > 900_000) return null
  return { contents, hasImage }
}

export const gemini = onRequest(
  {
    region: 'europe-west1',
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 300,
    memory: '256MiB',
    // hard ceiling on parallel instances = hard ceiling on abuse cost
    maxInstances: 5,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
    if (!bearer) {
      res.status(401).json({ error: 'Missing auth token' })
      return
    }
    let uid: string
    let isGuest = false
    try {
      const decoded = await getAuth().verifyIdToken(bearer[1])
      uid = decoded.uid
      isGuest = decoded.firebase?.sign_in_provider === 'anonymous'
    } catch {
      res.status(401).json({ error: 'Invalid or expired auth token' })
      return
    }

    // Monitor first; enforcement is an explicit deployment switch after the
    // installed clients are confirmed to send valid tokens.
    let appChecked = false
    const attestation = req.headers['x-firebase-appcheck']
    if (typeof attestation === 'string' && attestation) {
      try {
        await getAppCheck().verifyToken(attestation)
        appChecked = true
      } catch {
        // invalid/expired token — counted below like a missing one
      }
    }
    if (!appChecked) {
      if (process.env.APPCHECK_ENFORCE === 'true') {
        res.status(403).json({ error: 'App integrity check failed.' })
        return
      }
      console.log(`[appcheck] unverified request uid=${uid} token=${attestation ? 'invalid' : 'missing'}`)
    }

    // Cheap rejections first: an oversized request must not burn quota.
    if (Number(req.headers['content-length'] ?? 0) > 1_000_000) {
      res.status(413).json({ error: 'Request too large' })
      return
    }
    if (JSON.stringify(req.body ?? {}).length > 1_000_000) {
      res.status(413).json({ error: 'Request too large' })
      return
    }

    if (!(await underRateLimit(uid, isGuest ? RATE_LIMIT_GUEST : RATE_LIMIT))) {
      res.status(429).json({ error: 'Too many requests - please wait a moment.' })
      return
    }

    // The freemium DAILY caps. read, solve and verify count PROBLEMS (a stable
    // per-problem id makes the fan-out — deep escalation, correction re-solve
    // — charge ONE slot); purpose=followup counts chat questions per problem
    // (10/day each — learning is generous, but chat can't become an unmetered
    // solving side door). verify reuses the solve id, so it is idempotent;
    // a tampered verify request with a new id consumes a slot.
    // Premium users skip both. The 429 body shapes are a contract with the
    // client (src/ai/limits.ts) — they open the upsell sheet.
    const purpose = String(req.headers['x-rezolvo-purpose'] ?? '') as RequestPurpose
    if (purpose !== 'solve' && purpose !== 'verify' && purpose !== 'followup' && purpose !== 'read') {
      res.status(400).json({ error: 'Invalid request purpose' })
      return
    }
    const problemId = String(req.headers['x-rezolvo-problem'] ?? '')
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(problemId)) {
      res.status(400).json({ error: 'Invalid problem id' })
      return
    }
    if (!(await isPremium(uid))) {
      // WHO is metered: signed-in users by uid (the account's limit, on any
      // device); guests by INSTALL id — anonymous uids are minted fresh on
      // every sign-out, so keying guests by uid would make "log out, get 2
      // more" an infinite loop. No/invalid device header falls back to uid.
      const deviceRaw = String(req.headers['x-rezolvo-device'] ?? '')
      const capKey = isGuest && /^[A-Za-z0-9_-]{8,64}$/.test(deviceRaw) ? `device_${deviceRaw}` : uid
      // Reading a photographed statement is part of solving that problem.
      // It uses the same stable problem id, so the normal read -> solve flow
      // consumes one slot total while OCR cannot become an unmetered AI path.
      if (purpose === 'read' || purpose === 'solve' || purpose === 'verify') {
        const limit = isGuest ? DAILY_SOLVES_GUEST : DAILY_SOLVES_USER
        const cap = await underDailyCap(capKey, problemId, limit)
        if (!cap.allowed) {
          res.status(429).json({ error: 'Daily solve limit reached.', code: 'DAILY_LIMIT', used: cap.used, limit, guest: isGuest })
          return
        }
        // Usage rides on the response so the app can show "3/5 azi" without
        // an extra endpoint.
        res.set('X-Daily-Used', String(cap.used))
        res.set('X-Daily-Limit', String(limit))
      } else if (purpose === 'followup') {
        const cap = await underChatCap(capKey, problemId, DAILY_CHAT_PER_PROBLEM)
        if (!cap.allowed) {
          res.status(429).json({ error: 'Daily chat limit reached for this problem.', code: 'CHAT_LIMIT', used: cap.used, limit: cap.limit, guest: isGuest })
          return
        }
      }
    }

    // Forward only the fields the app legitimately sends, and clamp the
    // cost-bearing knobs server-side - a tampered client can't raise them.
    const body = (req.body ?? {}) as {
      contents?: unknown
      systemInstruction?: unknown
      generationConfig?: Record<string, unknown>
      tools?: unknown
    }
    const systemPrompt = readSystemPrompt(body.systemInstruction)
    const promptContract = systemPrompt ? findPromptContract(systemPrompt, purpose) : null
    const sanitized = sanitizeContents(body.contents)
    if (!systemPrompt || !promptContract || !sanitized || (promptContract.requiresImage && !sanitized.hasImage)) {
      res.status(400).json({ error: 'Invalid AI request contract' })
      return
    }
    const gen = body.generationConfig ?? {}
    // generationConfig is WHITELISTED field by field — spreading the client's
    // object verbatim would forward cost multipliers we never clamp
    // (candidateCount: 8 = 8x the output bill on one request).
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: Math.min(
        Number(gen.maxOutputTokens) || promptContract.maxOutputTokens,
        promptContract.maxOutputTokens,
      ),
    }
    if (typeof gen.temperature === 'number') {
      generationConfig.temperature = Math.max(0, Math.min(gen.temperature, 2))
    }
    if (gen.responseMimeType === 'application/json') generationConfig.responseMimeType = 'application/json'
    // Thinking control (Gemini 3.x): forward ONLY a valid nested
    // thinkingConfig.thinkingLevel and nothing else on that object — a tampered
    // client can't smuggle other fields through it.
    const tc = gen.thinkingConfig as { thinkingLevel?: unknown } | undefined
    if (tc && typeof tc === 'object' && typeof tc.thinkingLevel === 'string' && THINKING_LEVELS.has(tc.thinkingLevel)) {
      generationConfig.thinkingConfig = { thinkingLevel: tc.thinkingLevel }
    }
    // The only tool the app ever asks for is code execution (the verifier);
    // anything else a tampered client smuggles in is dropped.
    const wantsCodeExecution = promptContract.allowsCodeExecution === true &&
      Array.isArray(body.tools) && body.tools.some((t) => t && typeof t === 'object' && 'code_execution' in t)
    const payload = {
      contents: sanitized.contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      ...(wantsCodeExecution ? { tools: [{ code_execution: {} }] } : {}),
      generationConfig,
    }

    const requested = /\/models\/([^:]+):/.exec(req.path)?.[1]
    const model = requested && ALLOWED_MODELS.has(requested) ? requested : DEFAULT_MODEL

    const streaming = req.path.includes(':streamGenerateContent')
    let upstream: Response
    try {
      upstream = await fetch(
        `${GOOGLE_BASE}/models/${model}:${streaming ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY.value() },
          body: JSON.stringify(payload),
        },
      )
    } catch {
      // Network failure toward Google: a clean 502 the app can classify,
      // not an unhandled rejection that crashes into a bare 500.
      res.status(502).json({ error: 'AI upstream unreachable - please retry.' })
      return
    }

    res.status(upstream.status)
    res.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
    res.set('Cache-Control', 'no-cache')
    res.set('X-Accel-Buffering', 'no') // belt-and-braces: never buffer the stream
    if (!upstream.body) {
      res.end()
      return
    }
    // pipe Gemini's (possibly SSE) response through chunk by chunk
    const reader = upstream.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    res.end()
  },
)
