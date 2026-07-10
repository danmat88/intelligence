import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp()

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
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
])
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Per-user fixed-window rate limit. The window doc lives at the Firestore
// root (rate_limits/{uid}), which client security rules don't expose - only
// this function (Admin SDK) can touch it. Transactional, so parallel
// requests can't slip past the ceiling.
const RATE_LIMIT = 20 // requests
const RATE_WINDOW_MS = 60_000 // per minute

async function underRateLimit(uid: string): Promise<boolean> {
  const ref = getFirestore().collection('rate_limits').doc(uid)
  return getFirestore().runTransaction(async (tx) => {
    const now = Date.now()
    const data = (await tx.get(ref)).data() as { windowStart: number; count: number } | undefined
    if (!data || now - data.windowStart >= RATE_WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 })
      return true
    }
    if (data.count >= RATE_LIMIT) return false
    tx.update(ref, { count: data.count + 1 })
    return true
  })
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
    try {
      uid = (await getAuth().verifyIdToken(bearer[1])).uid
    } catch {
      res.status(401).json({ error: 'Invalid or expired auth token' })
      return
    }

    if (!(await underRateLimit(uid))) {
      res.status(429).json({ error: 'Too many requests - please wait a moment.' })
      return
    }

    if (Number(req.headers['content-length'] ?? 0) > 1_000_000) {
      res.status(413).json({ error: 'Request too large' })
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
    const payload = {
      contents: body.contents,
      systemInstruction: body.systemInstruction,
      // Forward tools (e.g. code execution) when the app asks for exact computation.
      ...(body.tools ? { tools: body.tools } : {}),
      generationConfig: {
        ...gen,
        maxOutputTokens: Math.min(Number(gen.maxOutputTokens) || 2048, 4096),
      },
    }

    const requested = /\/models\/([^:]+):/.exec(req.path)?.[1]
    const model = requested && ALLOWED_MODELS.has(requested) ? requested : DEFAULT_MODEL

    const streaming = req.path.includes(':streamGenerateContent')
    const upstream = await fetch(
      `${GOOGLE_BASE}/models/${model}:${streaming ? 'streamGenerateContent?alt=sse' : 'generateContent'}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY.value() },
        body: JSON.stringify(payload),
      },
    )

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
