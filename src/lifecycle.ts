/**
 * The root owns only app-level state transitions. Keeping these decisions
 * pure makes it impossible for an auth/profile update to accidentally replay
 * launch choreography or onboarding success UI.
 */
export type RootDestination = 'hold' | 'launch' | 'welcome' | 'onboarding' | 'app'

export function resolveRootDestination({
  fontsLoaded,
  authInitializing,
  nativeSplashHidden,
  launchFinished,
  hasUser,
  profileHydrated,
  onboardingCompleted,
}: {
  fontsLoaded: boolean
  authInitializing: boolean
  nativeSplashHidden: boolean
  launchFinished: boolean
  hasUser: boolean
  profileHydrated: boolean
  onboardingCompleted: boolean
}): RootDestination {
  if (!fontsLoaded || authInitializing || !nativeSplashHidden) return 'hold'
  if (!launchFinished) return 'launch'
  if (!hasUser || !profileHydrated) return 'welcome'
  if (!onboardingCompleted) return 'onboarding'
  return 'app'
}

export function shouldFinishLaunchWithoutCelebration({
  bootRevealed,
  hasUser,
  profileHydrated,
  onboardingCompleted,
  completedInThisFlow,
  openingSolver,
}: {
  bootRevealed: boolean
  hasUser: boolean
  profileHydrated: boolean
  onboardingCompleted: boolean
  completedInThisFlow: boolean
  openingSolver: boolean
}) {
  return (
    bootRevealed &&
    hasUser &&
    profileHydrated &&
    onboardingCompleted &&
    !completedInThisFlow &&
    !openingSolver
  )
}

export function shouldCelebrateOnboardingCompletion({
  bootRevealed,
  completedInThisFlow,
  goal,
}: {
  bootRevealed: boolean
  completedInThisFlow: boolean
  goal: string | null
}) {
  return bootRevealed && completedInThisFlow && goal !== null
}

export function shouldKeepOnboardingVisible({
  hasUser,
  onboardingCompleted,
  completedInThisFlow,
  openingSolver,
}: {
  hasUser: boolean
  onboardingCompleted: boolean
  completedInThisFlow: boolean
  openingSolver: boolean
}) {
  return (
    hasUser &&
    (!onboardingCompleted || completedInThisFlow || openingSolver)
  )
}
