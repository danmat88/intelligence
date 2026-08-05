import {
  resolveRootDestination,
  shouldCelebrateOnboardingCompletion,
  shouldFinishLaunchWithoutCelebration,
} from '../lifecycle'

describe('root lifecycle', () => {
  const ready = {
    fontsLoaded: true,
    authInitializing: false,
    nativeSplashHidden: true,
    profileHydrated: true,
  }

  it('uses launch choreography only once per app process', () => {
    expect(resolveRootDestination({
      ...ready,
      launchFinished: false,
      hasUser: true,
      onboardingCompleted: true,
    })).toBe('launch')

    expect(resolveRootDestination({
      ...ready,
      launchFinished: true,
      hasUser: true,
      onboardingCompleted: true,
    })).toBe('app')
  })

  it('routes logout to welcome rather than another splash or onboarding', () => {
    expect(resolveRootDestination({
      ...ready,
      launchFinished: true,
      hasUser: false,
      onboardingCompleted: false,
    })).toBe('welcome')
  })

  it('waits in welcome while a different account profile is hydrating', () => {
    expect(resolveRootDestination({
      ...ready,
      launchFinished: true,
      hasUser: true,
      profileHydrated: false,
      onboardingCompleted: false,
    })).toBe('welcome')
  })
})

describe('launch completion', () => {
  it('does not celebrate a returning user', () => {
    expect(shouldFinishLaunchWithoutCelebration({
      bootRevealed: true,
      hasUser: true,
      profileHydrated: true,
      onboardingCompleted: true,
      completedInThisFlow: false,
      openingSolver: false,
    })).toBe(true)

    expect(shouldCelebrateOnboardingCompletion({
      bootRevealed: true,
      completedInThisFlow: false,
      goal: 'en',
    })).toBe(false)
  })

  it('celebrates only an onboarding completion in this launch flow', () => {
    expect(shouldFinishLaunchWithoutCelebration({
      bootRevealed: true,
      hasUser: true,
      profileHydrated: true,
      onboardingCompleted: true,
      completedInThisFlow: true,
      openingSolver: false,
    })).toBe(false)

    expect(shouldCelebrateOnboardingCompletion({
      bootRevealed: true,
      completedInThisFlow: true,
      goal: 'general',
    })).toBe(true)
  })
})
