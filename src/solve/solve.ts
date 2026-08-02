import { ai } from '../ai'
import type { ChatTurn } from '../ai/types'
import { DailyLimitError } from '../ai/limits'
import type { CapturedImage } from './capture'
import {
  SOLVE_JSON_SYSTEM,
  FOLLOWUP_SYSTEM,
  GUIDED_FOLLOWUP_SYSTEM,
  GUIDED_START_SYSTEM,
  READ_PROBLEM_IMAGE_SYSTEM,
  REVIEW_WORK_SYSTEM,
  SIMILAR_PROBLEM_SYSTEM,
  SOLVE_USER_PROMPT,
  VERIFY_SYSTEM,
} from './prompt'
import { definitiveVerdict, getSolveJson, isHardProblem, withJsonFlags, type CheckerReply, type Verdict } from './verdict'

// Model routing, the way fast consumer math apps do it:
//   FAST (flash-lite) answers everything the user sees — measured ~2s for a
//   school problem. DEEP (pro) is the silent safety net: if the fast model
//   errors out or emits broken JSON, we escalate once and the user just sees a
//   slightly slower solve. DEEP is also the future premium/verification engine.
// Every learner-facing answer is contractually Romanian; the math stays LaTeX.
// PINNED to exact GA ids, not `-latest` aliases: the aliases hot-swap silently,
// and one such swap put verification on Gemini 3.5 Flash (~45s/check). Measured
// July 2026: 3.1 flash-lite ~1.6s solve / ~6-10s verify, 3.1 pro ~8s. 3.5 Flash
// is a latency trap on code-execution tasks (~30s even at minimal thinking), so
// it is deliberately NOT used. Revisit when 3.1 pro leaves preview.
const FAST = 'gemini-3.1-flash-lite'
const DEEP = 'gemini-3.1-pro-preview'
// Verify starts fast and escalates to the deep model. Honesty comes from
// REQUIRING code execution (definitiveVerdict), not from model IQ — a running
// sympy result is authoritative, so flash-lite is a fine first checker (with
// minimal thinking: the code decides, not rumination — ~6s vs ~10s) and
// escalates to pro when the result isn't code-backed-definitive.
const VERIFY_MODEL = FAST

const SOLVE = { json: true, temperature: 0.2, maxTokens: 4096 } as const

export type ReadProblemImageResult = {
  problem: string
  topic: string
  containsWork: boolean
}

function parseObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    const value = JSON.parse(trimmed) as unknown
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

export function parseReadProblemImage(raw: string): ReadProblemImageResult | { error: string } | null {
  const value = parseObject(raw)
  if (!value) return null
  if (typeof value.error === 'string' && value.error.trim() && value.error.length <= 300) {
    return { error: value.error.trim() }
  }
  if (
    typeof value.problem !== 'string' || !value.problem.trim() || value.problem.length > 5000 ||
    typeof value.topic !== 'string' || !value.topic.trim() || value.topic.length > 100 ||
    typeof value.containsWork !== 'boolean'
  ) return null
  return {
    problem: value.problem.trim(),
    topic: value.topic.trim(),
    containsWork: value.containsWork,
  }
}

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
    // Over the daily cap: escalating to DEEP would just hit the same wall
    // (and waste a request) — surface the limit to the UI immediately.
    if (e instanceof DailyLimitError) throw e
    // The safety net gets held to the same standard: broken output from DEEP
    // must surface as a retryable error, never render as a raw text blob.
    const out = await call(DEEP)
    if (!valid(out)) throw new Error('deep model returned unusable output')
    return tagJson ? withJsonFlags(out, { _model: 'deep' }) : out
  }
}

// Every solve-path request carries purpose=solve + the problem's stable id, so
// the proxy's daily cap charges ONE slot per problem no matter how many
// requests the flow fans into (escalation, correction re-solve, retry).
function solveCall(
  signal?: AbortSignal,
  image?: CapturedImage,
  problemId?: string,
  confirmedProblem?: string,
) {
  return async (model: string) => {
    const prompt = image
      ? confirmedProblem?.trim()
        ? [
            'Rezolvă enunțul confirmat de utilizator de mai jos.',
            'Folosește imaginea pentru figură și context vizual, dar enunțul confirmat are prioritate dacă OCR-ul și fotografia diferă.',
            `ENUNȚ CONFIRMAT:\n${confirmedProblem.trim()}`,
          ].join('\n\n')
        : SOLVE_USER_PROMPT
      : ''
    const { text } = await ai.generate(prompt, {
      ...(image ? { image: { base64: image.base64, mimeType: image.mimeType } } : {}),
      system: SOLVE_JSON_SYSTEM,
      model,
      ...SOLVE,
      purpose: 'solve',
      problemId,
      signal,
    })
    return text.trim()
  }
}

/** First solve from a photo → structured JSON solution. */
export async function solveImage(
  image: CapturedImage,
  signal?: AbortSignal,
  problemId?: string,
  confirmedProblem?: string,
): Promise<string> {
  return withFallback(solveCall(signal, image, problemId, confirmedProblem), looksLikeValidSolve, signal)
}

/** First solve from a typed problem → structured JSON solution. */
export async function solveProblem(problem: string, signal?: AbortSignal, problemId?: string): Promise<string> {
  const call = async (model: string) => {
    const { text } = await ai.generate(problem, {
      system: SOLVE_JSON_SYSTEM,
      model,
      ...SOLVE,
      purpose: 'solve',
      problemId,
      signal,
    })
    return text.trim()
  }
  // Proof-style problems skip the fast model entirely — it's weakest there and
  // code verification can't grade a proof anyway.
  if (isHardProblem(problem)) return withJsonFlags(await call(DEEP), { _model: 'deep' })
  return withFallback(call, looksLikeValidSolve, signal)
}

/** Read and confirm a photographed statement before selecting a help mode. */
export async function readProblemImage(
  image: CapturedImage,
  signal?: AbortSignal,
  problemId?: string,
): Promise<ReadProblemImageResult> {
  const { text } = await ai.generate('Transcrie problema din imagine fără să o rezolvi.', {
    image: { base64: image.base64, mimeType: image.mimeType },
    system: READ_PROBLEM_IMAGE_SYSTEM,
    model: FAST,
    json: true,
    temperature: 0,
    maxTokens: 1400,
    purpose: 'read',
    problemId,
    signal,
  })
  const result = parseReadProblemImage(text)
  if (!result) throw new Error('Nu am putut confirma enunțul din fotografie.')
  if ('error' in result) throw new Error(result.error)
  return result
}

/** Start a Socratic thread without generating or displaying the solution. */
export async function startGuidedProblem(
  problem: string,
  signal?: AbortSignal,
  problemId?: string,
  image?: CapturedImage,
): Promise<string> {
  const prompt = image
    ? `ENUNȚ CONFIRMAT:\n${problem.trim()}\n\nFolosește imaginea numai pentru figură și context vizual.`
    : problem
  const { text } = await ai.generate(prompt, {
    ...(image ? { image: { base64: image.base64, mimeType: image.mimeType } } : null),
    system: GUIDED_START_SYSTEM,
    model: FAST,
    temperature: 0.25,
    maxTokens: 700,
    purpose: 'solve',
    problemId,
    signal,
  })
  const reply = text.trim()
  if (!reply) throw new Error('Nu am primit primul pas ghidat.')
  return reply
}

/** Continue guided work while keeping the final answer locked. */
export async function followUpGuided(
  turns: ChatTurn[],
  signal?: AbortSignal,
  problemId?: string,
): Promise<string> {
  const { text } = await ai.chat(turns, {
    system: GUIDED_FOLLOWUP_SYSTEM,
    model: FAST,
    temperature: 0.25,
    maxTokens: 900,
    purpose: 'followup',
    problemId,
    signal,
  })
  const reply = text.trim()
  if (!reply) throw new Error('Nu am primit următorul pas ghidat.')
  return reply
}

/** Generate a fresh exercise statement without leaking its solution. */
export async function createSimilarProblem(
  turns: ChatTurn[],
  signal?: AbortSignal,
  problemId?: string,
): Promise<string> {
  const { text } = await ai.chat(turns, {
    system: SIMILAR_PROBLEM_SYSTEM,
    model: FAST,
    temperature: 0.45,
    maxTokens: 500,
    purpose: 'followup',
    problemId,
    signal,
  })
  const reply = text.trim()
  if (!reply || reply.length > 1800) throw new Error('Nu am primit un exercițiu similar valid.')
  return reply
}

/** Review typed learner work without replacing it with a complete solution. */
export async function reviewWork(
  problem: string,
  work: string,
  signal?: AbortSignal,
  problemId?: string,
): Promise<string> {
  const prompt = `PROBLEMĂ:\n${problem.trim()}\n\nLUCRAREA ELEVULUI:\n${work.trim()}`
  const { text } = await ai.generate(prompt, {
    system: REVIEW_WORK_SYSTEM,
    model: DEEP,
    temperature: 0.1,
    maxTokens: 1200,
    purpose: 'solve',
    problemId,
    signal,
  })
  const reply = text.trim()
  if (!reply) throw new Error('Nu am primit verificarea lucrării.')
  return reply
}

/** Review handwriting visible in the same photo as the problem. */
export async function reviewWorkImage(
  problem: string,
  image: CapturedImage,
  workNote = '',
  signal?: AbortSignal,
  problemId?: string,
): Promise<string> {
  const prompt = [
    `PROBLEMA CONFIRMATĂ:\n${problem.trim()}`,
    'Verifică numai lucrarea/răspunsul vizibil în imagine. Nu confunda textul tipărit al enunțului cu pașii elevului.',
    workNote.trim() ? `NOTĂ SCRISĂ DE ELEV:\n${workNote.trim()}` : '',
  ].filter(Boolean).join('\n\n')
  const { text } = await ai.generate(prompt, {
    image: { base64: image.base64, mimeType: image.mimeType },
    system: REVIEW_WORK_SYSTEM,
    model: DEEP,
    temperature: 0.1,
    maxTokens: 1200,
    purpose: 'solve',
    problemId,
    signal,
  })
  const reply = text.trim()
  if (!reply) throw new Error('Nu am primit verificarea lucrării din fotografie.')
  return reply
}

/** Re-solve a problem statement with the DEEP model (verification escalation).
 *  `hint` (e.g. CORRECTION_HINT) is appended so a re-solve after a failed check
 *  knows to re-read the givens instead of repeating the same misread. */
export async function solveDeep(
  problem: string,
  signal?: AbortSignal,
  hint?: string,
  problemId?: string,
): Promise<string> {
  const { text } = await ai.generate(hint ? problem + hint : problem, {
    system: SOLVE_JSON_SYSTEM,
    model: DEEP,
    ...SOLVE,
    purpose: 'solve',
    problemId,
    signal,
  })
  return withJsonFlags(text.trim(), { _model: 'deep' })
}

/**
 * Verify a solution's final answer by making the model WRITE AND RUN CODE
 * (sympy) against the problem. Returns 'unverifiable' on any doubt/failure —
 * the badge only ever appears on a real, machine-checked pass.
 */
export async function verifyAnswer(
  problemText: string,
  solutionRaw: string,
  signal?: AbortSignal,
  problemId?: string,
): Promise<Verdict> {
  const j = getSolveJson(solutionRaw)
  const problem = String(j?.problem ?? '').trim() || problemText.trim()
  const answer = String(j?.answer ?? '').trim()
  if (!problem || !answer) return 'unverifiable'

  const ask = `Problem: ${problem}\nProposed final answer: ${answer}`
  const runChecker = async (model: string, thinkingLevel?: 'minimal'): Promise<CheckerReply> => {
    const { text, codeExecuted, truncated } = await ai.generate(ask, {
      system: VERIFY_SYSTEM,
      model,
      tools: [{ code_execution: {} }],
      temperature: 0,
      purpose: 'verify', // same id as solve: idempotent in the server-side meter
      problemId,
      thinkingLevel,
      // Generous budget: a verdict truncated mid-reply used to vanish as a
      // silent "unverifiable" (now caught by `truncated`).
      maxTokens: 4096,
      signal,
    })
    return { text, codeExecuted: !!codeExecuted, truncated: !!truncated }
  }

  try {
    // Trust a verdict only when the checker actually RAN code and wasn't cut
    // off. A CORRECT-from-vibes, a missing verdict, or a truncated reply are
    // all inconclusive on flash-lite → escalate ONCE to the deep model. Only if
    // the deep model is also inconclusive does the answer stay unverified.
    // flash-lite runs with minimal thinking (fast); pro escalation uses its default.
    const first = await runChecker(VERIFY_MODEL, 'minimal')
    const d1 = definitiveVerdict(first)
    if (d1) return d1
    if (signal?.aborted) return 'unverifiable'
    const second = await runChecker(DEEP)
    return definitiveVerdict(second) ?? 'unverifiable'
  } catch {
    return 'unverifiable'
  }
}

/** A follow-up about the current problem → conversational Markdown + LaTeX.
 *  Carries the problem's id: follow-ups are metered per problem per day
 *  (generous — 10 — but bounded, so chat can't become an unmetered solver). */
export async function followUp(turns: ChatTurn[], signal?: AbortSignal, problemId?: string): Promise<string> {
  return withFallback(
    async (model) => {
      const { text } = await ai.chat(turns, {
        system: FOLLOWUP_SYSTEM,
        model,
        temperature: 0.4,
        maxTokens: 1500,
        purpose: 'followup',
        problemId,
        signal,
      })
      return text.trim()
    },
    (out) => out.length > 0,
    signal,
    false, // prose reply — never rewrite it through the JSON tagger
  )
}
