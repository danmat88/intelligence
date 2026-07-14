import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getAuth } from 'firebase-admin/auth'
import { underRateLimit, RATE_LIMIT, RATE_LIMIT_GUEST } from './ratelimit'

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
// and a stolen client still can't run anything pricier.
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest'
const ALLOWED_MODELS = new Set([
  DEFAULT_MODEL,
  // Pinned GA ids the app now uses.
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
  // `-latest` aliases kept so already-shipped builds keep working.
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
])
const THINKING_LEVELS = new Set(['minimal', 'low', 'medium', 'high'])
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta'

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

    // Cheap rejections first: an oversized request must not burn quota.
    if (Number(req.headers['content-length'] ?? 0) > 1_000_000) {
      res.status(413).json({ error: 'Request too large' })
      return
    }

    if (!(await underRateLimit(uid, isGuest ? RATE_LIMIT_GUEST : RATE_LIMIT))) {
      res.status(429).json({ error: 'Too many requests - please wait a moment.' })
      return
    }

    // Forward only the fields the app legitimately sends, and clamp the
    // cost-bearing knobs server-side - a tampered client can't raise them.
    const body = (req.body ?? {}) as {
      contents?: unknown
      systemInstruction?: unknown
      generationConfig?: Record<string, unknown>
      tools?: unknown
    }
    const gen = body.generationConfig ?? {}
    // generationConfig is WHITELISTED field by field — spreading the client's
    // object verbatim would forward cost multipliers we never clamp
    // (candidateCount: 8 = 8x the output bill on one request).
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: Math.min(Number(gen.maxOutputTokens) || 2048, 4096),
    }
    if (typeof gen.temperature === 'number') generationConfig.temperature = gen.temperature
    if (typeof gen.responseMimeType === 'string') generationConfig.responseMimeType = gen.responseMimeType
    // Thinking control (Gemini 3.x): forward ONLY a valid nested
    // thinkingConfig.thinkingLevel and nothing else on that object — a tampered
    // client can't smuggle other fields through it.
    const tc = gen.thinkingConfig as { thinkingLevel?: unknown } | undefined
    if (tc && typeof tc === 'object' && typeof tc.thinkingLevel === 'string' && THINKING_LEVELS.has(tc.thinkingLevel)) {
      generationConfig.thinkingConfig = { thinkingLevel: tc.thinkingLevel }
    }
    // The only tool the app ever asks for is code execution (the verifier);
    // anything else a tampered client smuggles in is dropped.
    const wantsCodeExecution =
      Array.isArray(body.tools) && body.tools.some((t) => t && typeof t === 'object' && 'code_execution' in t)
    const payload = {
      contents: body.contents,
      systemInstruction: body.systemInstruction,
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
