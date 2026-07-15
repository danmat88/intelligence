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
  /** Force the response to be a single valid JSON object (structured solutions). */
  json?: boolean
  /** Gemini tools payload (e.g. [{ code_execution: {} }] for the verifier). */
  tools?: unknown
  /** Gemini 3.x thinking control (sent as generationConfig.thinkingConfig.
   *  thinkingLevel). 'minimal' keeps the verifier fast — the sandboxed code is
   *  the authority, so the model shouldn't ruminate. Omit for the model default.
   *  NB: 'high' truncates JSON solves — never set it on a structured solve. */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
  /** Abort to stop generation early; streaming resolves with the partial text. */
  signal?: AbortSignal
  /** Per-call model override (must be on the server's whitelist in proxy mode). */
  model?: string
  /** What this request is for, billing-wise. The proxy counts ONLY 'solve'
   *  requests against the free daily cap; 'verify'/'followup' ride on an
   *  already-charged problem. Sent as a header in proxy mode. */
  purpose?: 'solve' | 'verify' | 'followup'
  /** Stable id of the problem this request belongs to. All the requests of one
   *  problem (fast solve, deep escalation, correction re-solve) share it, so
   *  the fan-out charges ONE daily-cap slot, and a retry is free. */
  problemId?: string
}

export type AIResult = {
  text: string
  /** Round-trip latency in milliseconds — handy for showing real numbers. */
  ms: number
  /** Verifier only: true when the model actually RAN code (a code-execution
   *  result came back OK). The "Verified" badge must never trust a verdict the
   *  checker produced without executing anything. */
  codeExecuted?: boolean
  /** True when the reply was cut off at the token ceiling (finishReason
   *  MAX_TOKENS) — a verdict line after the cut is missing, not absent. */
  truncated?: boolean
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
