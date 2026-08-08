import {
  InvalidLearningProfileError,
  isDefinitiveProfileSnapshot,
  isDefinitiveOnboardingState,
  makeCompletedProfile,
  parseLearningProfile,
} from '../profile'

describe('learning profile contract', () => {
  test('a cached miss waits for the server instead of starting onboarding', () => {
    expect(isDefinitiveProfileSnapshot(false, true)).toBe(false)
    expect(isDefinitiveProfileSnapshot(true, true)).toBe(true)
    expect(isDefinitiveProfileSnapshot(false, false)).toBe(true)
  })

  test('cached onboarding completion is usable but cached incompletion waits', () => {
    expect(isDefinitiveOnboardingState(true, true)).toBe(true)
    expect(isDefinitiveOnboardingState(false, true)).toBe(false)
    expect(isDefinitiveOnboardingState(false, false)).toBe(true)
  })

  test('malformed stored data is rejected instead of starting onboarding', () => {
    expect(() => parseLearningProfile(null)).toThrow(InvalidLearningProfileError)
    expect(() => parseLearningProfile({ onboardingCompleted: 'yes', examGoal: 'other' }))
      .toThrow(InvalidLearningProfileError)
    expect(() => parseLearningProfile({
      schemaVersion: 99,
      onboardingCompleted: true,
      examGoal: 'en',
      bacTrack: null,
    })).toThrow(InvalidLearningProfileError)
    expect(() => parseLearningProfile({
      schemaVersion: 1,
      onboardingCompleted: true,
      examGoal: 'bac',
      bacTrack: null,
    })).toThrow(InvalidLearningProfileError)
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
