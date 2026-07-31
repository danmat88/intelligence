import { findPracticeExercise } from './catalog'
import { configuredSetFromId } from './generator'
import type { PracticeAttempt } from './store'

export type CompetencyProgress = {
  competency: string
  correct: number
  attempts: number
  percent: number
}

export function calculateCompetencyProgress(attempts: PracticeAttempt[]): CompetencyProgress[] {
  const totals = new Map<string, { correct: number; attempts: number }>()
  for (const attempt of attempts) {
    const configured = configuredSetFromId(attempt.setId)
    for (const answer of attempt.answers) {
      const found = findPracticeExercise(answer.exerciseId, configured)
      if (!found) continue
      const current = totals.get(found.exercise.competency) ?? { correct: 0, attempts: 0 }
      current.attempts += 1
      if (answer.correct) current.correct += 1
      totals.set(found.exercise.competency, current)
    }
  }
  return [...totals.entries()]
    .map(([competency, evidence]) => ({
      competency,
      ...evidence,
      percent: Math.round((evidence.correct / evidence.attempts) * 100),
    }))
    .sort((left, right) => left.percent - right.percent || right.attempts - left.attempts)
}
