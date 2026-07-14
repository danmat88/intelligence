import {
  parseVerdict,
  definitiveVerdict,
  isHardProblem,
  getSolveJson,
  isStructuredSolution,
  withJsonFlags,
} from '../verdict'

describe('parseVerdict', () => {
  it('reads each verdict', () => {
    expect(parseVerdict('...code ran...\nVERDICT: CORRECT')).toBe('correct')
    expect(parseVerdict('VERDICT: INCORRECT')).toBe('incorrect')
    expect(parseVerdict('VERDICT: UNVERIFIABLE')).toBe('unverifiable')
  })
  it('is case/spacing tolerant and takes the LAST verdict', () => {
    expect(parseVerdict('verdict:   correct')).toBe('correct')
    expect(parseVerdict('First guess VERDICT: INCORRECT ... after checking VERDICT: CORRECT')).toBe('correct')
  })
  it('defaults to unverifiable on garbage or empty', () => {
    expect(parseVerdict('the model rambled with no verdict')).toBe('unverifiable')
    expect(parseVerdict('')).toBe('unverifiable')
  })
})

describe('definitiveVerdict — the badge-honesty gate', () => {
  it('trusts a CORRECT/INCORRECT only when code actually ran', () => {
    expect(definitiveVerdict({ text: 'VERDICT: CORRECT', codeExecuted: true, truncated: false })).toBe('correct')
    expect(definitiveVerdict({ text: 'VERDICT: INCORRECT', codeExecuted: true, truncated: false })).toBe('incorrect')
  })

  it('REJECTS a verdict the checker produced without running code (vibes) → escalate', () => {
    // This is the core failure the engine used to have: a badge on an unchecked claim.
    expect(definitiveVerdict({ text: 'VERDICT: CORRECT', codeExecuted: false, truncated: false })).toBeNull()
    expect(definitiveVerdict({ text: 'VERDICT: INCORRECT', codeExecuted: false, truncated: false })).toBeNull()
  })

  it('REJECTS a truncated reply even if code ran and a verdict is present', () => {
    expect(definitiveVerdict({ text: 'VERDICT: CORRECT', codeExecuted: true, truncated: true })).toBeNull()
  })

  it('REJECTS a missing verdict line (rambled, no VERDICT) → escalate', () => {
    expect(definitiveVerdict({ text: 'I ran some code but forgot to conclude', codeExecuted: true, truncated: false })).toBeNull()
  })

  it('treats an explicit UNVERIFIABLE as inconclusive → escalate', () => {
    expect(definitiveVerdict({ text: 'VERDICT: UNVERIFIABLE', codeExecuted: true, truncated: false })).toBeNull()
  })
})

describe('isHardProblem', () => {
  it('routes proof-style problems to deep', () => {
    expect(isHardProblem('Demonstrați că suma a două numere pare este pară')).toBe(true)
    expect(isHardProblem('Arătați că √2 este irațional')).toBe(true)
    expect(isHardProblem('Prove that the square root of 2 is irrational')).toBe(true)
    expect(isHardProblem('Show that n^2 >= n for n >= 1')).toBe(true)
  })
  it('leaves computational problems on the fast path', () => {
    expect(isHardProblem('2x^2 + 5x - 3 = 0')).toBe(false)
    expect(isHardProblem('Calculează integrala lui x·e^x')).toBe(false)
  })
})

describe('solve JSON helpers', () => {
  const solution = JSON.stringify({
    problem: '2x^2+5x-3=0',
    topic: 'Quadratics',
    steps: [{ math: 'x=1/2', why: 'formula' }],
    answer: 'x = 1/2, x = -3',
  })

  it('getSolveJson parses even with surrounding noise', () => {
    expect(getSolveJson('```json\n' + solution + '\n```')?.topic).toBe('Quadratics')
    expect(getSolveJson('no json here')).toBeNull()
  })

  it('isStructuredSolution: true for solutions, false for error shape and prose', () => {
    expect(isStructuredSolution(solution)).toBe(true)
    expect(isStructuredSolution('{"error":"not math"}')).toBe(false)
    expect(isStructuredSolution('plain markdown follow-up')).toBe(false)
  })

  it('withJsonFlags merges flags and round-trips', () => {
    const flagged = withJsonFlags(solution, { _model: 'fast', _verified: true })
    const j = getSolveJson(flagged)
    expect(j?._model).toBe('fast')
    expect(j?._verified).toBe(true)
    expect(j?.answer).toBe('x = 1/2, x = -3')
    // non-JSON passes through untouched
    expect(withJsonFlags('nope', { a: 1 })).toBe('nope')
  })
})
