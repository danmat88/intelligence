import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

import { useAuth } from '../auth/AuthProvider'
import { useOnline } from '../lib/connectivity'
import { useProduct } from '../product/ProductProvider'
import {
  INITIAL_APP_LIFECYCLE,
  resolveAppLifecycle,
  type AppLifecycleSnapshot,
} from './lifecycle'

type AppLifecycleValue = AppLifecycleSnapshot & {
  online: boolean
  /** The cold-launch cover may reveal only a definitive destination or error. */
  launchReady: boolean
  /** Navigation is reset only when account ownership changes. */
  navigationKey: string
}

const AppLifecycleContext = createContext<AppLifecycleValue | null>(null)

export function AppLifecycleProvider({ children }: { children: ReactNode }) {
  const { user, initializing, operation } = useAuth()
  const { profileStatus, onboardingCompleted } = useProduct()
  const online = useOnline()
  const previousRef = useRef<AppLifecycleSnapshot>(INITIAL_APP_LIFECYCLE)

  const snapshot = useMemo(
    () => resolveAppLifecycle(previousRef.current, {
      authInitializing: initializing,
      authOperation: operation,
      userId: user?.id ?? null,
      profileStatus,
      onboardingCompleted,
      online,
    }),
    [initializing, onboardingCompleted, online, operation, profileStatus, user?.id],
  )

  // Record only committed renders. This avoids a one-render reducer lag while
  // also keeping aborted concurrent renders out of lifecycle history.
  useLayoutEffect(() => {
    previousRef.current = snapshot
  }, [snapshot])

  const value = useMemo<AppLifecycleValue>(() => ({
    ...snapshot,
    online,
    launchReady: snapshot.phase !== 'auth-loading' && snapshot.phase !== 'profile-loading',
    navigationKey: snapshot.sessionId ? `user:${snapshot.sessionId}` : 'signed-out',
  }), [online, snapshot])

  return (
    <AppLifecycleContext.Provider value={value}>
      {children}
    </AppLifecycleContext.Provider>
  )
}

export function useAppLifecycle(): AppLifecycleValue {
  const value = useContext(AppLifecycleContext)
  if (!value) throw new Error('useAppLifecycle must be used within <AppLifecycleProvider>')
  return value
}
