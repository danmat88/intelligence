/**
 * Pure helpers for the correctness engine — no React/AI imports, so they are
 * unit-testable in plain Node (see __tests__/verify.test.ts).
 */

export type Verdict = 'correct' | 'incorrect' | 'unverifiable'

/** Extract the machine verdict line from the checker's reply (last one wins). */
export function parseVerdict(text: string): Verdict {
  const matches = [...String(text ?? '').matchAll(/VERDICT:\s*(CORRECT|INCORRECT|UNVERIFIABLE)/gi)]
  const last = matches.length ? matches[matches.length - 1][1].toUpperCase() : ''
  if (last === 'CORRECT') return 'correct'
  if (last === 'INCORRECT') return 'incorrect'
  return 'unverifiable'
}

/**
 * Problems the fast model is genuinely weak at (proof-style work) go straight
 * to the deep model — verification can't grade a proof anyway.
 */
export function isHardProblem(text: string): boolean {
  return /demonstr|ar[ăa]ta[țt]i\s+c[ăa]|prove\b|show\s+that|induc[țt]ie|induction/i.test(text)
}

/** Parse the {...} JSON object out of a solve response (returns null if none). */
export function getSolveJson(raw: string): Record<string, unknown> | null {
  const s = raw.indexOf('{')
  const e = raw.lastIndexOf('}')
  if (s < 0 || e <= s) return null
  try {
    const j = JSON.parse(raw.slice(s, e + 1))
    return j && typeof j === 'object' ? (j as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** True when the response is a real structured solution (not the error shape). */
export function isStructuredSolution(raw: string): boolean {
  const j = getSolveJson(raw)
  return !!j && !j.error && (Array.isArray(j.steps) || typeof j.answer === 'string')
}

/** Return the solve response with extra flags merged into its JSON. */
export function withJsonFlags(raw: string, flags: Record<string, unknown>): string {
  const j = getSolveJson(raw)
  if (!j) return raw
  return JSON.stringify({ ...j, ...flags })
}
