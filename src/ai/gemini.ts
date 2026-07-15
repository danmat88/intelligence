import type { AIClient, AIResult, ChatTurn, GenerateOptions } from './types'
import { DailyLimitError, parseDailyLimit } from './limits'
import { reportDailyUsage, clearDailyUsage } from './usage'

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
  /** Proxy mode: per-install id — the proxy keys the GUEST daily cap on it,
   *  so signing out (fresh anonymous uid) can't reset the free allowance. */
  getDeviceId?: () => Promise<string | null>
  /** Proxy mode: App Check attestation token (null when unavailable — the
   *  proxy is monitor-only until enforcement flips server-side). */
  getAppCheckToken?: () => Promise<string | null>
  model: string
  /** Override for a server proxy in production (defaults to Google's API). */
  baseUrl?: string
}

type Part = {
  text?: string
  inlineData?: { mimeType: string; data: string }
  // Present when the model uses the code-execution tool (the verifier): the
  // code it wrote, and the result of actually running it.
  executableCode?: { language?: string; code?: string }
  codeExecutionResult?: { outcome?: string; output?: string }
}
type Content = { role: 'user' | 'model'; parts: Part[] }

/** Extract the text carried by the given complete SSE `data:` lines. Exported for tests. */
export function extractSSE(raw: string): string {
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
      const h: Record<string, string> = { Authorization: `Bearer ${token}` }
      const device = await config.getDeviceId?.().catch(() => null)
      if (device) h['X-Rezolvo-Device'] = device
      const appCheck = await config.getAppCheckToken?.().catch(() => null)
      if (appCheck) h['X-Firebase-AppCheck'] = appCheck
      return h
    }
    if (!config.apiKey) {
      throw new Error(
        'AI is not configured: set EXPO_PUBLIC_AI_PROXY_URL (production) or EXPO_PUBLIC_GEMINI_API_KEY (dev), then restart with: npm start -c',
      )
    }
    return { 'x-goog-api-key': config.apiKey }
  }

  /** Freemium metering headers — only meaningful to OUR proxy (it counts
   *  purpose=solve against the daily cap); never sent direct-to-Google. */
  function meterHeaders(opts: GenerateOptions): Record<string, string> {
    if (!config.getAuthToken) return {}
    const h: Record<string, string> = {}
    if (opts.purpose) h['X-Rezolvo-Purpose'] = opts.purpose
    if (opts.problemId) h['X-Rezolvo-Problem'] = opts.problemId
    return h
  }

  function buildBody(contents: Content[], opts: GenerateOptions): Record<string, unknown> {
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
        // Gemini 3.x thinking control is the NESTED shape thinkingConfig.
        // thinkingLevel (the flat `thinkingLevel` or 2.5's thinkingBudget 400).
        // Omitted → model default. Never pass 'high' with json — it truncates.
        ...(opts.thinkingLevel ? { thinkingConfig: { thinkingLevel: opts.thinkingLevel } } : {}),
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    }
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }
    if (opts.tools) body.tools = opts.tools
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
    const headers = { ...(await authHeaders()), ...meterHeaders(opts) }
    const body = JSON.stringify(buildBody(contents, opts))
    const url = `${base}/models/${opts.model ?? config.model}:generateContent`
    const t0 = Date.now()

    // Transient 429/503s get up to two quick retries — but only when the
    // failure came back FAST. A slow failure means the server held the request
    // while congested; retrying would just double the user's wait.
    for (let attempt = 0; ; attempt++) {
      const tReq = Date.now()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
        signal: opts.signal,
      })
      if (res.ok) {
        // Metered solves carry today's usage in headers — feed the "2/5 azi"
        // pill. A solve WITHOUT them means the meter no longer applies
        // (premium) — clear, so the pill never shows a stale count.
        if (opts.purpose === 'solve') {
          const used = Number(res.headers.get('x-daily-used'))
          const limit = Number(res.headers.get('x-daily-limit'))
          if (used > 0 && limit > 0) reportDailyUsage(used, limit)
          else clearDailyUsage()
        }
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]
        }
        const cand = data.candidates?.[0]
        const parts = cand?.content?.parts ?? []
        const text = parts.map((p) => p.text).filter(Boolean).join('')
        // Proof the checker actually executed code (not just claimed a verdict).
        const codeExecuted = parts.some((p) => p.codeExecutionResult?.outcome === 'OUTCOME_OK')
        const truncated = cand?.finishReason === 'MAX_TOKENS'
        return { text, ms: Date.now() - t0, codeExecuted, truncated }
      }
      const failedFast = Date.now() - tReq < 8000
      const detail = await res.text().catch(() => '')
      // A DAILY_LIMIT 429 is a decision, not congestion: retrying is pointless
      // (tomorrow or Premium changes it, another attempt doesn't) — surface it
      // as its own error type so the UI opens the upsell instead of "busy".
      if (res.status === 429) {
        const limitInfo = parseDailyLimit(detail)
        if (limitInfo) {
          // The wall itself is also usage information — pin the pill to full.
          if (limitInfo.kind === 'solve') reportDailyUsage(limitInfo.used, limitInfo.limit)
          throw new DailyLimitError(limitInfo)
        }
      }
      const retryable = (res.status === 429 || res.status === 503) && failedFast && attempt < 2
      if (!retryable || opts.signal?.aborted) {
        throw new Error(`Gemini ${res.status}: ${detail || res.statusText}`)
      }
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
    }
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
      const headers = { ...(await authHeaders()), ...meterHeaders(opts) }
      return new Promise<AIResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${base}/models/${opts.model ?? config.model}:streamGenerateContent?alt=sse`)
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

        // user hit stop: abort the request and keep whatever already arrived
        opts.signal?.addEventListener('abort', () => xhr.abort())

        xhr.onreadystatechange = () => {
          // readyState 3 = LOADING: responseText grows as chunks arrive
          if (xhr.readyState >= 3 && xhr.responseText) {
            consume(xhr.responseText.lastIndexOf('\n') + 1)
          }
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              consume(xhr.responseText.length) // flush any unterminated tail
              resolve({ text: delivered, ms: Date.now() - t0 })
            } else if (opts.signal?.aborted) {
              resolve({ text: delivered, ms: Date.now() - t0 })
            } else {
              const limitInfo = xhr.status === 429 ? parseDailyLimit(xhr.responseText) : null
              reject(limitInfo ? new DailyLimitError(limitInfo) : new Error(`Gemini ${xhr.status}: ${xhr.responseText || 'stream error'}`))
            }
          }
        }
        xhr.onerror = () =>
          opts.signal?.aborted
            ? resolve({ text: delivered, ms: Date.now() - t0 })
            : reject(new Error('Network error during streaming'))
        xhr.send(JSON.stringify(buildBody(toContents(turns), opts)))
      })
    },
  }
}
