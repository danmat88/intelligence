import type { AuthOperation } from '../auth/AuthProvider'
import type { ProfileStatus } from '../product/ProductProvider'

/**
 * App-level lifecycle destinations. Feature navigation is available only after
 * Firebase and the matching Firestore profile agree on the active identity.
 */
export type AppPhase =
  | 'auth-loading'
  | 'signed-out'
  | 'account-transition'
  | 'profile-loading'
  | 'profile-error'
  | 'onboarding'
  | 'app'

export type AppLifecycleSnapshot = {
  phase: AppPhase
  /** Identity whose navigation history is currently safe to retain. */
  sessionId: string | null
}

export type AppLifecycleInput = {
  authInitializing: boolean
  authOperation: AuthOperation
  userId: string | null
  profileStatus: ProfileStatus
  onboardingCompleted: boolean
  online: boolean
}

export const INITIAL_APP_LIFECYCLE: AppLifecycleSnapshot = {
  phase: 'auth-loading',
  sessionId: null,
}

function isUserPhase(phase: AppPhase): boolean {
  return phase === 'profile-loading'
    || phase === 'profile-error'
    || phase === 'onboarding'
    || phase === 'app'
}

function resolveSettledPhase({
  userId,
  profileStatus,
  onboardingCompleted,
  online,
}: AppLifecycleInput): AppLifecycleSnapshot {
  if (!userId) return { phase: 'signed-out', sessionId: null }
  if (profileStatus === 'error' || (!online && profileStatus !== 'ready')) {
    return { phase: 'profile-error', sessionId: userId }
  }
  if (profileStatus !== 'ready') {
    return { phase: 'profile-loading', sessionId: userId }
  }
  return {
    phase: onboardingCompleted ? 'app' : 'onboarding',
    sessionId: userId,
  }
}

/**
 * Resolve one synchronous, committed lifecycle snapshot.
 *
 * Auth providers emit several valid intermediate values during credential
 * linking and account replacement. Those values must never be interpreted as
 * a first-time user. The previous committed snapshot lets the UI stay put for
 * a same-identity operation and use a neutral transition for an identity swap.
 */
export function resolveAppLifecycle(
  previous: AppLifecycleSnapshot,
  input: AppLifecycleInput,
): AppLifecycleSnapshot {
  if (input.authInitializing) return INITIAL_APP_LIFECYCLE

  if (input.authOperation === 'signing-in') {
    // A login launched from Welcome remains one continuous Welcome state. The
    // profile hydrates behind it and is classified only after login completes.
    if (previous.phase === 'signed-out') return previous

    // Linking Google to a guest keeps the Firebase uid. Preserve the current
    // app/onboarding surface instead of pretending the session restarted.
    if (
      input.userId
      && previous.sessionId === input.userId
      && isUserPhase(previous.phase)
    ) {
      return previous
    }

    // Switching a guest to an already-existing Google account changes uid.
    // Never expose either account's feature/profile state during that handoff.
    return {
      phase: 'account-transition',
      sessionId: input.userId ?? previous.sessionId,
    }
  }

  if (
    input.authOperation === 'signing-out'
    || input.authOperation === 'deleting-account'
  ) {
    // Keep the initiating surface stable while Firebase still owns the same
    // user. Once that user disappears, Welcome becomes immediately truthful.
    if (
      input.userId
      && previous.sessionId === input.userId
      && isUserPhase(previous.phase)
    ) {
      return previous
    }
    // Firebase no longer owns a user, so Welcome is already the truthful
    // destination. It remains disabled until the account operation settles.
    if (!input.userId) return { phase: 'signed-out', sessionId: null }
    return { phase: 'account-transition', sessionId: input.userId }
  }

  const settled = resolveSettledPhase(input)

  // Coalesce profile hydration into the surface that initiated it. This turns
  // Welcome -> loader -> destination and transition -> loader -> destination
  // into one stable wait followed by one meaningful navigation change.
  if (settled.phase === 'profile-loading') {
    if (previous.phase === 'signed-out') return previous
    if (
      previous.phase === 'account-transition'
      && previous.sessionId === input.userId
    ) {
      return previous
    }
  }

  // Onboarding is an entry flow, never a fallback for an established session.
  // If a live profile unexpectedly regresses, protect the app from a surprise
  // onboarding takeover and surface the recoverable profile state instead.
  if (
    previous.phase === 'app'
    && previous.sessionId === input.userId
    && settled.phase === 'onboarding'
  ) {
    return { phase: 'profile-error', sessionId: previous.sessionId }
  }

  return settled
}

export type AppEntry = 'home' | 'solver'

export function shouldOpenSolver(entry: AppEntry): boolean {
  return entry === 'solver'
}
