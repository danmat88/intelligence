import { buildConfiguredSet } from '../generator'
import { calculateCompetencyEvidence } from '../progress'
import type { PracticeAttempt } from '../store'

describe('progresul bazat pe dovezi', () => {
  it('agregă numai răspunsurile reale după competență', () => {
    const set = buildConfiguredSet('en', { chapter: 'algebra', count: 5, seed: 55 })
    const attempt: PracticeAttempt = {
      id: 'attempt-1',
      setId: set.id,
      exam: 'en',
      score: 3,
      total: 5,
      startedAt: 0,
      completedAt: 1,
      mode: 'practice',
      elapsedSeconds: 1,
      answers: set.exercises.map((exercise, index) => ({
        exerciseId: exercise.id,
        value: exercise.accepted[0],
        correct: index < 3,
        assistance: index === 0 ? 'hint' as const : 'none' as const,
      })),
    }
    expect(calculateCompetencyEvidence([attempt])).toEqual([
      {
        competency: 'Ecuații de gradul I',
        correct: 2,
        attempts: 4,
        assistedAttempts: 1,
        percent: 50,
        confidence: 'medium',
      },
    ])
  })

  it('nu inventează progres fără încercări', () => {
    expect(calculateCompetencyEvidence([])).toEqual([])
  })
})
