import { answerMatches, PRACTICE_LIBRARY, PRACTICE_SETS } from '../catalog'

describe('practice answer validation', () => {
  it('accepts equivalent fraction forms', () => {
    const exercise = PRACTICE_SETS.en.exercises[0]
    expect(answerMatches(exercise, '11 / 8')).toBe(true)
    expect(answerMatches(exercise, '1,375')).toBe(true)
    expect(answerMatches(exercise, '8/11')).toBe(false)
  })

  it('accepts roots in either order', () => {
    const exercise = PRACTICE_SETS.bac.exercises[0]
    expect(answerMatches(exercise, '2; 3')).toBe(true)
    expect(answerMatches(exercise, '3,2')).toBe(true)
    expect(answerMatches(exercise, '2, 4')).toBe(false)
  })

  it('normalizes mathematical minus characters', () => {
    const exercise = PRACTICE_SETS.bac.exercises[1]
    expect(answerMatches(exercise, '6x − 4')).toBe(true)
  })

  it('keeps every shipped exercise identifiable and answerable', () => {
    const exercises = Object.values(PRACTICE_LIBRARY).flatMap((sets) =>
      sets.flatMap((set) => set.exercises),
    )
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length)
    for (const exercise of exercises) {
      expect(exercise.accepted.length).toBeGreaterThan(0)
      expect(answerMatches(exercise, exercise.accepted[0])).toBe(true)
      expect(exercise.hint.length).toBeGreaterThan(10)
      expect(exercise.explanation.length).toBeGreaterThan(10)
    }
  })
})
