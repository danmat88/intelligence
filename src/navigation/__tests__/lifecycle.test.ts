import {
  INITIAL_APP_LIFECYCLE,
  resolveAppLifecycle,
  shouldOpenSolver,
  type AppLifecycleInput,
  type AppLifecycleSnapshot,
} from '../lifecycle'

describe('app lifecycle routing', () => {
  const ready: AppLifecycleInput = {
    authInitializing: false,
    authOperation: 'idle',
    userId: 'user-a',
    profileStatus: 'ready',
    onboardingCompleted: true,
    online: true,
  }
  const app: AppLifecycleSnapshot = { phase: 'app', sessionId: 'user-a' }
  const signedOut: AppLifecycleSnapshot = { phase: 'signed-out', sessionId: null }

  it('holds routing until Firebase restores the persisted session', () => {
    expect(resolveAppLifecycle(app, { ...ready, authInitializing: true }))
      .toEqual(INITIAL_APP_LIFECYCLE)
  })

  it('routes a settled empty auth session to Welcome', () => {
    expect(resolveAppLifecycle(app, { ...ready, userId: null, profileStatus: 'idle' }))
      .toEqual(signedOut)
  })

  it('never treats an unresolved profile as a new-user profile', () => {
    expect(resolveAppLifecycle(INITIAL_APP_LIFECYCLE, {
      ...ready,
      profileStatus: 'loading',
      onboardingCompleted: false,
    })).toEqual({ phase: 'profile-loading', sessionId: 'user-a' })
  })

  it('surfaces offline and subscription failures without changing profile meaning', () => {
    expect(resolveAppLifecycle(app, {
      ...ready,
      profileStatus: 'loading',
      online: false,
    })).toEqual({ phase: 'profile-error', sessionId: 'user-a' })
    expect(resolveAppLifecycle(app, { ...ready, profileStatus: 'error' }))
      .toEqual({ phase: 'profile-error', sessionId: 'user-a' })
  })

  it('shows onboarding only for a settled, valid, incomplete active profile', () => {
    expect(resolveAppLifecycle(signedOut, { ...ready, onboardingCompleted: false }))
      .toEqual({ phase: 'onboarding', sessionId: 'user-a' })
  })

  it('never lets an established session regress into onboarding', () => {
    expect(resolveAppLifecycle(app, { ...ready, onboardingCompleted: false }))
      .toEqual({ phase: 'profile-error', sessionId: 'user-a' })
  })

  it('keeps Welcome stable while a new login and its profile resolve', () => {
    expect(resolveAppLifecycle(signedOut, {
      ...ready,
      authOperation: 'signing-in',
      onboardingCompleted: false,
    })).toEqual(signedOut)

    expect(resolveAppLifecycle(signedOut, {
      ...ready,
      profileStatus: 'loading',
      onboardingCompleted: false,
    })).toEqual(signedOut)
  })

  it('keeps the app stable when a guest links Google without changing uid', () => {
    expect(resolveAppLifecycle(app, { ...ready, authOperation: 'signing-in' }))
      .toEqual(app)
  })

  it('uses a neutral handoff when login replaces the Firebase identity', () => {
    const switching = resolveAppLifecycle(app, {
      ...ready,
      authOperation: 'signing-in',
      userId: 'user-b',
      onboardingCompleted: false,
    })
    expect(switching).toEqual({ phase: 'account-transition', sessionId: 'user-b' })

    expect(resolveAppLifecycle(switching, {
      ...ready,
      userId: 'user-b',
      profileStatus: 'loading',
      onboardingCompleted: false,
    })).toEqual(switching)

    expect(resolveAppLifecycle(switching, {
      ...ready,
      userId: 'user-b',
    })).toEqual({ phase: 'app', sessionId: 'user-b' })
  })

  it.each(['signing-out', 'deleting-account'] as const)(
    'routes %s directly to Welcome once Firebase drops the user',
    (authOperation) => {
      expect(resolveAppLifecycle(app, { ...ready, authOperation })).toEqual(app)

      const welcome = resolveAppLifecycle(app, {
        ...ready,
        authOperation,
        userId: null,
        profileStatus: 'idle',
        onboardingCompleted: false,
      })
      expect(welcome).toEqual(signedOut)

      expect(resolveAppLifecycle(welcome, {
        ...ready,
        userId: null,
        profileStatus: 'idle',
        onboardingCompleted: false,
      })).toEqual(signedOut)
    },
  )

  it('opens the solver only when onboarding explicitly requests it', () => {
    expect(shouldOpenSolver('home')).toBe(false)
    expect(shouldOpenSolver('solver')).toBe(true)
  })
})
