import type { AIClient, AIResult, GenerateOptions } from './types'

/**
 * Gemini implementation of {@link AIClient}, talking straight to the REST API
 * with `fetch`. No SDK, so it works everywhere React Native runs and stays
 * trivial to swap or proxy.
 *
 * Supports plain text and vision (pass `opts.image`).
 */
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

type GeminiConfig = {
  apiKey: string
  model: string
  /** Override for a server proxy in production (defaults to Google's API). */
  baseUrl?: string
}

export function createGeminiClient(config: GeminiConfig): AIClient {
  const base = config.baseUrl ?? BASE

  return {
    async generate(prompt: string, opts: GenerateOptions = {}): Promise<AIResult> {
      if (!config.apiKey) {
        throw new Error(
          'Missing Gemini API key. Paste it into .env as EXPO_PUBLIC_GEMINI_API_KEY, then restart with: npm start -c',
        )
      }

      const parts: Record<string, unknown>[] = [{ text: prompt }]
      if (opts.image) {
        parts.push({ inlineData: { mimeType: opts.image.mimeType, data: opts.image.base64 } })
      }

      const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 1024,
          temperature: opts.temperature ?? 0.7,
        },
      }
      if (opts.system) {
        body.systemInstruction = { parts: [{ text: opts.system }] }
      }

      const t0 = Date.now()
      // Key goes in the x-goog-api-key header (not the URL) — works for both the
      // legacy AIza... keys and the newer AQ... keys, and keeps it out of logs.
      const res = await fetch(`${base}/models/${config.model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify(body),
      })
      const ms = Date.now() - t0

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Gemini ${res.status}: ${detail || res.statusText}`)
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join('') ?? ''

      return { text, ms }
    },
  }
}
