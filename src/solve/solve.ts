import { ai } from '../ai'
import type { ChatTurn } from '../ai/types'
import type { CapturedImage } from './capture'
import { SOLVE_JSON_SYSTEM, FOLLOWUP_SYSTEM, SOLVE_USER_PROMPT } from './prompt'

// Model routing, the way fast consumer math apps do it:
//   FAST (flash-lite) answers everything the user sees — measured ~2s for a
//   school problem. DEEP (pro) is the silent safety net: if the fast model
//   errors out or emits broken JSON, we escalate once and the user just sees a
//   slightly slower solve. DEEP is also the future premium/verification engine.
// `langName` ("Romanian"/"English") localizes every human-readable string the
// model produces; the math itself stays LaTeX.
const FAST = 'gemini-flash-lite-latest'
const DEEP = 'gemini-pro-latest'

const SOLVE = { json: true, temperature: 0.2, maxTokens: 4096 } as const

/** A structured solve must contain parseable JSON — otherwise escalate. */
function looksLikeValidSolve(raw: string): boolean {
  const s = raw.indexOf('{')
  const e = raw.lastIndexOf('}')
  if (s < 0 || e <= s) return false
  try {
    JSON.parse(raw.slice(s, e + 1))
    return true
  } catch {
    return false
  }
}

async function withFallback(
  call: (model: string) => Promise<string>,
  valid: (out: string) => boolean,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const out = await call(FAST)
    if (!valid(out)) throw new Error('fast model returned unusable output')
    return out
  } catch (e) {
    if (signal?.aborted) throw e
    return call(DEEP)
  }
}

/** First solve from a photo → structured JSON solution. */
export async function solveImage(image: CapturedImage, langName: string, signal?: AbortSignal): Promise<string> {
  return withFallback(
    async (model) => {
      const { text } = await ai.generate(SOLVE_USER_PROMPT, {
        image: { base64: image.base64, mimeType: image.mimeType },
        system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
        model,
        ...SOLVE,
        signal,
      })
      return text.trim()
    },
    looksLikeValidSolve,
    signal,
  )
}

/** First solve from a typed problem → structured JSON solution. */
export async function solveProblem(problem: string, langName: string, signal?: AbortSignal): Promise<string> {
  return withFallback(
    async (model) => {
      const { text } = await ai.generate(problem, {
        system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
        model,
        ...SOLVE,
        signal,
      })
      return text.trim()
    },
    looksLikeValidSolve,
    signal,
  )
}

/** A follow-up about the current problem → conversational Markdown + LaTeX. */
export async function followUp(turns: ChatTurn[], langName: string, signal?: AbortSignal): Promise<string> {
  return withFallback(
    async (model) => {
      const { text } = await ai.chat(turns, {
        system: FOLLOWUP_SYSTEM.replaceAll('{LANG}', langName),
        model,
        temperature: 0.4,
        maxTokens: 1500,
        signal,
      })
      return text.trim()
    },
    (out) => out.length > 0,
    signal,
  )
}
