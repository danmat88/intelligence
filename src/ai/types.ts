/**
 * Provider-agnostic AI interface. The rest of the app only ever imports from
 * `src/ai` — never a specific provider — so swapping Gemini for anything else
 * (or pointing at a server proxy) is a one-file change in `src/ai/index.ts`.
 */

export type GenerateOptions = {
  /** System instruction that steers the model's behaviour. */
  system?: string
  /** Hard cap on generated tokens. Output is the expensive side — keep it tight. */
  maxTokens?: number
  /** 0 = deterministic, higher = more creative. */
  temperature?: number
  /** A base64-encoded image (no `data:` prefix) for vision requests. */
  image?: { base64: string; mimeType: string }
}

export type AIResult = {
  text: string
  /** Round-trip latency in milliseconds — handy for showing real numbers. */
  ms: number
}

export interface AIClient {
  generate(prompt: string, opts?: GenerateOptions): Promise<AIResult>
}
