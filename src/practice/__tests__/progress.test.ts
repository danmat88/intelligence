import { buildConfiguredSet } from '../generator'
import { calculateCompetencyProgress } from '../progress'
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
      completedAt: 1,
      answers: set.exercises.map((exercise, index) => ({
        exerciseId: exercise.id,
        value: exercise.accepted[0],
        correct: index < 3,
      })),
    }
    expect(calculateCompetencyProgress([attempt])).toEqual([
      {
        competency: 'Ecuații de gradul I',
        correct: 3,
        attempts: 5,
        percent: 60,
      },
    ])
  })

  it('nu inventează progres fără încercări', () => {
    expect(calculateCompetencyProgress([])).toEqual([])
  })
})
