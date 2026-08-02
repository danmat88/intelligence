import { findPracticeExercise } from './catalog'
import { configuredSetFromId } from './generator'
import type { PracticeAttempt } from './store'

export type CompetencyEvidence = {
  competency: string
  correct: number
  attempts: number
  assistedAttempts: number
  /** Accuracy of independent answers. Null means there is no independent
   * evidence yet; assisted work must never masquerade as performance. */
  percent: number | null
  confidence: 'none' | 'low' | 'medium' | 'high'
}

export function calculateCompetencyEvidence(attempts: PracticeAttempt[]): CompetencyEvidence[] {
  const totals = new Map<string, { correct: number; attempts: number; assistedAttempts: number }>()
  for (const attempt of attempts) {
    const configured = configuredSetFromId(attempt.setId)
    for (const answer of attempt.answers) {
      const found = findPracticeExercise(answer.exerciseId, configured)
      const competency = answer.competency?.trim() || found?.exercise.competency
      if (!competency) continue
      const current = totals.get(competency) ?? {
        correct: 0,
        attempts: 0,
        assistedAttempts: 0,
      }
      if (answer.assistance !== 'none') {
        current.assistedAttempts += 1
        totals.set(competency, current)
        continue
      }
      current.attempts += 1
      if (answer.correct) current.correct += 1
      totals.set(competency, current)
    }
  }
  return [...totals.entries()]
    .map(([competency, evidence]) => ({
      competency,
      ...evidence,
      percent: evidence.attempts > 0
        ? Math.round((evidence.correct / evidence.attempts) * 100)
        : null,
      confidence: evidence.attempts === 0
        ? 'none' as const
        : evidence.attempts < 3
          ? 'low' as const
          : evidence.attempts < 7
            ? 'medium' as const
            : 'high' as const,
    }))
    .sort((left, right) => {
      if (left.percent == null) return 1
      if (right.percent == null) return -1
      return left.percent - right.percent || right.attempts - left.attempts
    })
}
