import { ai } from '../ai'
import type { ChatTurn } from '../ai/types'
import type { CapturedImage } from './capture'
import { SOLVE_JSON_SYSTEM, FOLLOWUP_SYSTEM, SOLVE_USER_PROMPT } from './prompt'

// Solving uses the strong reasoning model in JSON mode → structured steps we can
// render as the crafted "textbook" card. Follow-ups use the cheaper model in
// plain prose (the solution already explained everything). Both models reason
// by default — we deliberately send no thinkingConfig (see gemini.ts).
// `langName` ("Romanian"/"English") localizes every human-readable string the
// model produces; the math itself stays LaTeX.
const SOLVE = {
  json: true,
  model: 'gemini-pro-latest',
  temperature: 0.2,
  maxTokens: 4096,
} as const

/** First solve from a photo → structured JSON solution. */
export async function solveImage(image: CapturedImage, langName: string, signal?: AbortSignal): Promise<string> {
  const { text } = await ai.generate(SOLVE_USER_PROMPT, {
    image: { base64: image.base64, mimeType: image.mimeType },
    system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
    ...SOLVE,
    signal,
  })
  return text.trim()
}

/** First solve from a typed problem → structured JSON solution. */
export async function solveProblem(problem: string, langName: string, signal?: AbortSignal): Promise<string> {
  const { text } = await ai.generate(problem, {
    system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
    ...SOLVE,
    signal,
  })
  return text.trim()
}

/** A follow-up about the current problem → conversational Markdown + LaTeX. */
export async function followUp(turns: ChatTurn[], langName: string, signal?: AbortSignal): Promise<string> {
  const { text } = await ai.chat(turns, {
    system: FOLLOWUP_SYSTEM.replaceAll('{LANG}', langName),
    model: 'gemini-flash-latest',
    temperature: 0.4,
    maxTokens: 1500,
    signal,
  })
  return text.trim()
}
