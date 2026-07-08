import type { AIClient, AIResult, ChatTurn, GenerateOptions } from './types'

/**
 * Gemini implementation of {@link AIClient}, talking straight to the REST API.
 * No SDK, so it works everywhere React Native runs and stays trivial to swap or
 * proxy. Supports single prompts, multi-turn chat, streaming, and vision.
 */
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

type GeminiConfig = {
  /** Direct-to-Google mode: the raw API key (dev/prototyping only). */
  apiKey?: string
  /** Proxy mode: returns the signed-in user's token, sent as a Bearer header. */
  getAuthToken?: () => Promise<string | null>
  model: string
  /** Override for a server proxy in production (defaults to Google's API). */
  baseUrl?: string
}

type Part = { text?: string; inlineData?: { mimeType: string; data: string } }
type Content = { role: 'user' | 'model'; parts: Part[] }

/** Extract the text carried by the given complete SSE `data:` lines. */
function extractSSE(raw: string): string {
  let out = ''
  for (const line of raw.split('\n')) {
    const l = line.trim()
    if (!l.startsWith('data:')) continue
    const json = l.slice(5).trim()
    if (!json || json === '[DONE]') continue
    try {
      const chunk = JSON.parse(json) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const piece = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') ?? ''
      out += piece
    } catch {
      // partial JSON (line still in flight) — it'll be fed back once complete
    }
  }
  return out
}

export function createGeminiClient(config: GeminiConfig): AIClient {
  const base = config.baseUrl ?? BASE

  /** Auth headers for a request: user token (proxy mode) or raw key (direct mode). */
  async function authHeaders(): Promise<Record<string, string>> {
    if (config.getAuthToken) {
      const token = await config.getAuthToken()
      if (!token) throw new Error('Not signed in. Please sign in and try again.')
      return { Authorization: `Bearer ${token}` }
    }
    if (!config.apiKey) {
      throw new Error(
        'AI is not configured: set EXPO_PUBLIC_AI_PROXY_URL (production) or EXPO_PUBLIC_GEMINI_API_KEY (dev), then restart with: npm start -c',
      )
    }
    return { 'x-goog-api-key': config.apiKey }
  }

  function buildBody(contents: Content[], opts: GenerateOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        // No pre-answer "thinking" — text starts streaming immediately (snappier
        // chat + cheaper). Bump this for heavier reasoning tasks later.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }
    return body
  }

  function toContents(turns: ChatTurn[]): Content[] {
    return turns.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.text }],
    }))
  }

  async function run(contents: Content[], opts: GenerateOptions): Promise<AIResult> {
    // Credentials go in headers (not the URL) so they stay out of logs.
    const headers = await authHeaders()
    const t0 = Date.now()
    const res = await fetch(`${base}/models/${config.model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(buildBody(contents, opts)),
    })
    const ms = Date.now() - t0
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Gemini ${res.status}: ${detail || res.statusText}`)
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') ?? ''
    return { text, ms }
  }

  return {
    generate(prompt, opts = {}) {
      const parts: Part[] = [{ text: prompt }]
      if (opts.image) parts.push({ inlineData: { mimeType: opts.image.mimeType, data: opts.image.base64 } })
      return run([{ role: 'user', parts }], opts)
    },

    chat(turns, opts = {}) {
      return run(toContents(turns), opts)
    },

    /**
     * Streaming chat via XHR + Server-Sent Events — the most compatible way to
     * stream in React Native / Expo Go. `onToken` fires with each new delta.
     */
    async stream(turns, onToken, opts = {}) {
      const headers = await authHeaders()
      return new Promise<AIResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${base}/models/${config.model}:streamGenerateContent?alt=sse`)
        xhr.setRequestHeader('Content-Type', 'application/json')
        for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)

        const t0 = Date.now()
        let delivered = ''
        // responseText only ever grows; parse each region once (O(n) overall,
        // not O(n²)) by consuming up to the last complete line per event
        let scanned = 0

        const consume = (upTo: number) => {
          if (upTo <= scanned) return
          const piece = extractSSE(xhr.responseText.slice(scanned, upTo))
          scanned = upTo
          if (piece) {
            delivered += piece
            onToken(piece)
          }
        }

        xhr.onreadystatechange = () => {
          // readyState 3 = LOADING: responseText grows as chunks arrive
          if (xhr.readyState >= 3 && xhr.responseText) {
            consume(xhr.responseText.lastIndexOf('\n') + 1)
          }
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              consume(xhr.responseText.length) // flush any unterminated tail
              resolve({ text: delivered, ms: Date.now() - t0 })
            } else {
              reject(new Error(`Gemini ${xhr.status}: ${xhr.responseText || 'stream error'}`))
            }
          }
        }
        xhr.onerror = () => reject(new Error('Network error during streaming'))
        xhr.send(JSON.stringify(buildBody(toContents(turns), opts)))
      })
    },
  }
}
