import { ai } from '../ai'
import type { ChatTurn } from '../ai/types'
import type { CapturedImage } from './capture'
import { SOLVE_JSON_SYSTEM, FOLLOWUP_SYSTEM, SOLVE_USER_PROMPT, VERIFY_SYSTEM } from './prompt'
import { definitiveVerdict, getSolveJson, isHardProblem, withJsonFlags, type CheckerReply, type Verdict } from './verdict'

// Model routing, the way fast consumer math apps do it:
//   FAST (flash-lite) answers everything the user sees — measured ~2s for a
//   school problem. DEEP (pro) is the silent safety net: if the fast model
//   errors out or emits broken JSON, we escalate once and the user just sees a
//   slightly slower solve. DEEP is also the future premium/verification engine.
// `langName` ("Romanian"/"English") localizes every human-readable string the
// model produces; the math itself stays LaTeX.
const FAST = 'gemini-flash-lite-latest'
const DEEP = 'gemini-pro-latest'
// Verify starts fast and escalates to the deep model. Honesty comes from
// REQUIRING code execution (definitiveVerdict), not from model IQ — a running
// sympy result is authoritative, so flash-lite (~6s, verified running correct
// code) is a fine first checker and escalates to pro (~9s) when it isn't
// code-backed-definitive. NB: the plain `flash` alias is avoided on purpose —
// measured ~45s per verify (it currently thinks enormously); this is exactly
// the "-latest aliases drift" risk the pinning item tracks.
const VERIFY_MODEL = FAST

const SOLVE = { json: true, temperature: 0.2, maxTokens: 4096 } as const

/** A structured solve must contain parseable JSON — otherwise escalate. */
function looksLikeValidSolve(raw: string): boolean {
  return getSolveJson(raw) !== null
}

/** Try FAST, escalate to DEEP on failure; tag the result with who solved it.
 *  `tagJson` is for structured solves only — follow-ups are PROSE, and
 *  re-serializing a prose reply that happens to contain a JSON object would
 *  throw away everything around it. */
async function withFallback(
  call: (model: string) => Promise<string>,
  valid: (out: string) => boolean,
  signal?: AbortSignal,
  tagJson = true,
): Promise<string> {
  try {
    const out = await call(FAST)
    if (!valid(out)) throw new Error('fast model returned unusable output')
    return tagJson ? withJsonFlags(out, { _model: 'fast' }) : out
  } catch (e) {
    if (signal?.aborted) throw e
    // The safety net gets held to the same standard: broken output from DEEP
    // must surface as a retryable error, never render as a raw text blob.
    const out = await call(DEEP)
    if (!valid(out)) throw new Error('deep model returned unusable output')
    return tagJson ? withJsonFlags(out, { _model: 'deep' }) : out
  }
}

function solveCall(langName: string, signal?: AbortSignal, image?: CapturedImage) {
  return async (model: string) => {
    const { text } = await ai.generate(image ? SOLVE_USER_PROMPT : '', {
      ...(image ? { image: { base64: image.base64, mimeType: image.mimeType } } : {}),
      system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
      model,
      ...SOLVE,
      signal,
    })
    return text.trim()
  }
}

/** First solve from a photo → structured JSON solution. */
export async function solveImage(image: CapturedImage, langName: string, signal?: AbortSignal): Promise<string> {
  return withFallback(solveCall(langName, signal, image), looksLikeValidSolve, signal)
}

/** First solve from a typed problem → structured JSON solution. */
export async function solveProblem(problem: string, langName: string, signal?: AbortSignal): Promise<string> {
  const call = async (model: string) => {
    const { text } = await ai.generate(problem, {
      system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
      model,
      ...SOLVE,
      signal,
    })
    return text.trim()
  }
  // Proof-style problems skip the fast model entirely — it's weakest there and
  // code verification can't grade a proof anyway.
  if (isHardProblem(problem)) return withJsonFlags(await call(DEEP), { _model: 'deep' })
  return withFallback(call, looksLikeValidSolve, signal)
}

/** Re-solve a problem statement with the DEEP model (verification escalation). */
export async function solveDeep(problem: string, langName: string, signal?: AbortSignal): Promise<string> {
  const { text } = await ai.generate(problem, {
    system: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', langName),
    model: DEEP,
    ...SOLVE,
    signal,
  })
  return withJsonFlags(text.trim(), { _model: 'deep' })
}

/**
 * Verify a solution's final answer by making the model WRITE AND RUN CODE
 * (sympy) against the problem. Returns 'unverifiable' on any doubt/failure —
 * the badge only ever appears on a real, machine-checked pass.
 */
export async function verifyAnswer(problemText: string, solutionRaw: string, signal?: AbortSignal): Promise<Verdict> {
  const j = getSolveJson(solutionRaw)
  const problem = String(j?.problem ?? '').trim() || problemText.trim()
  const answer = String(j?.answer ?? '').trim()
  if (!problem || !answer) return 'unverifiable'

  const ask = `Problem: ${problem}\nProposed final answer: ${answer}`
  const runChecker = async (model: string): Promise<CheckerReply> => {
    const { text, codeExecuted, truncated } = await ai.generate(ask, {
      system: VERIFY_SYSTEM,
      model,
      tools: [{ code_execution: {} }],
      temperature: 0,
      // Generous budget: the -latest models think by default, and a verdict
      // truncated mid-reply used to vanish as a silent "unverifiable".
      maxTokens: 4096,
      signal,
    })
    return { text, codeExecuted: !!codeExecuted, truncated: !!truncated }
  }

  try {
    // Trust a verdict only when the checker actually RAN code and wasn't cut
    // off. A CORRECT-from-vibes, a missing verdict, or a truncated reply are
    // all inconclusive on flash → escalate ONCE to the deep model. Only if the
    // deep model is also inconclusive does the answer stay unverified.
    const first = await runChecker(VERIFY_MODEL)
    const d1 = definitiveVerdict(first)
    if (d1) return d1
    if (signal?.aborted) return 'unverifiable'
    const second = await runChecker(DEEP)
    return definitiveVerdict(second) ?? 'unverifiable'
  } catch {
    return 'unverifiable'
  }
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
    false, // prose reply — never rewrite it through the JSON tagger
  )
}
