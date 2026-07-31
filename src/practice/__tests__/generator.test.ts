import { answerMatches } from '../catalog'
import { buildConfiguredSet, configuredSetFromId, type PracticeConfig } from '../generator'

describe('generatorul de teste configurabile', () => {
  const configs: PracticeConfig[] = [
    { chapter: 'mixt', count: 5, seed: 12345 },
    { chapter: 'algebra', count: 10, seed: 98765 },
    { chapter: 'geometrie', count: 15, seed: 42 },
  ]

  it('reconstruiește determinist același test', () => {
    for (const config of configs) {
      const first = buildConfiguredSet('en', config)
      const second = buildConfiguredSet('en', config)
      expect(second).toEqual(first)
      expect(first.exercises).toHaveLength(config.count)
    }
  })

  it('acceptă cel puțin un răspuns canonic pentru fiecare exercițiu', () => {
    for (const exam of ['en', 'bac'] as const) {
      const set = buildConfiguredSet(exam, { chapter: 'mixt', count: 15, seed: 20260729 })
      for (const exercise of set.exercises) {
        expect(answerMatches(exercise, exercise.accepted[0])).toBe(true)
        expect(exercise.hint.length).toBeGreaterThan(10)
        expect(exercise.explanation.length).toBeGreaterThan(10)
      }
    }
  })

  it('poate reconstrui testul salvat numai din identificator', () => {
    const set = buildConfiguredSet('bac', {
      chapter: 'analiza',
      count: 10,
      seed: 991122,
    })
    expect(configuredSetFromId(set.id)).toEqual(set)
  })
})
