import { ai } from '../ai'
import type { ChatTurn } from '../ai/types'
import type { CapturedImage } from './capture'
import { SOLVE_JSON_SYSTEM, FOLLOWUP_SYSTEM, SOLVE_USER_PROMPT } from './prompt'

// Solving uses the strong reasoning model in JSON mode → structured steps we can
// render as the crafted "textbook" card. Follow-ups use the cheaper model in
// plain prose (the solution already explained everything).
const SOLVE = {
  system: SOLVE_JSON_SYSTEM,
  json: true,
  model: 'gemini-pro-latest',
  thinking: true,
  temperature: 0.2,
  maxTokens: 4096,
} as const

/** First solve from a photo → structured JSON solution. */
export async function solveImage(image: CapturedImage, signal?: AbortSignal): Promise<string> {
  const { text } = await ai.generate(SOLVE_USER_PROMPT, {
    image: { base64: image.base64, mimeType: image.mimeType },
    ...SOLVE,
    signal,
  })
  return text.trim()
}

/** First solve from a typed problem → structured JSON solution. */
export async function solveProblem(problem: string, signal?: AbortSignal): Promise<string> {
  const { text } = await ai.generate(problem, { ...SOLVE, signal })
  return text.trim()
}

/** A follow-up about the current problem → conversational Markdown + LaTeX. */
export async function followUp(turns: ChatTurn[], signal?: AbortSignal): Promise<string> {
  const { text } = await ai.chat(turns, {
    system: FOLLOWUP_SYSTEM,
    model: 'gemini-flash-latest',
    temperature: 0.4,
    maxTokens: 1500,
    signal,
  })
  return text.trim()
}
