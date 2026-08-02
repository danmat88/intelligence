import {
  EMPTY_LEARNING_PROFILE,
  makeCompletedProfile,
  parseLearningProfile,
} from '../profile'

describe('learning profile contract', () => {
  test('missing or malformed data is treated as unfinished onboarding', () => {
    expect(parseLearningProfile(null)).toEqual(EMPTY_LEARNING_PROFILE)
    expect(parseLearningProfile({ onboardingCompleted: 'yes', examGoal: 'other' }))
      .toEqual(EMPTY_LEARNING_PROFILE)
    expect(parseLearningProfile({
      schemaVersion: 99,
      onboardingCompleted: true,
      examGoal: 'en',
      bacTrack: null,
    })).toEqual(EMPTY_LEARNING_PROFILE)
    expect(parseLearningProfile({
      schemaVersion: 1,
      onboardingCompleted: true,
      examGoal: 'bac',
      bacTrack: null,
    })).toEqual(EMPTY_LEARNING_PROFILE)
  })

  test('a user without an exam has no fake general curriculum', () => {
    expect(makeCompletedProfile(null)).toEqual({
      schemaVersion: 1,
      onboardingCompleted: true,
      examGoal: null,
      bacTrack: null,
    })
  })

  test('BAC requires a valid track', () => {
    expect(() => makeCompletedProfile('bac')).toThrow('Profilul BAC este obligatoriu.')
    expect(makeCompletedProfile('bac', 'stiinte_naturii')).toEqual({
      schemaVersion: 1,
      onboardingCompleted: true,
      examGoal: 'bac',
      bacTrack: 'stiinte_naturii',
    })
  })

  test('EN and no-exam profiles cannot retain a BAC track', () => {
    expect(parseLearningProfile({
      schemaVersion: 1,
      onboardingCompleted: true,
      examGoal: 'en',
      bacTrack: 'mate_info',
    }).bacTrack).toBeNull()
  })
})
