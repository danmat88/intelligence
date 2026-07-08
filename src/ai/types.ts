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
  /** Abort to stop generation early; streaming resolves with the partial text. */
  signal?: AbortSignal
  /** Per-call model override (must be on the server's whitelist in proxy mode). */
  model?: string
}

export type AIResult = {
  text: string
  /** Round-trip latency in milliseconds — handy for showing real numbers. */
  ms: number
}

export type ChatRole = 'user' | 'assistant'

/** One turn in a conversation. Order matters — full history gives the model context. */
export type ChatTurn = { role: ChatRole; text: string }

export interface AIClient {
  /** Single-shot prompt. */
  generate(prompt: string, opts?: GenerateOptions): Promise<AIResult>
  /** Multi-turn conversation — send the whole history so replies stay in context. */
  chat(turns: ChatTurn[], opts?: GenerateOptions): Promise<AIResult>
  /** Streaming multi-turn chat — `onToken` fires with each new delta of text. */
  stream(turns: ChatTurn[], onToken: (delta: string) => void, opts?: GenerateOptions): Promise<AIResult>
}
