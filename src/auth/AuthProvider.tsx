import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  getAuth,
  getIdToken,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  signInAnonymously,
  signInWithCredential,
  signOut as firebaseSignOut,
  updateProfile,
} from '@react-native-firebase/auth'
import { clearLocalImages } from '../solve/imageStore'
import { migrateGuestWork, deleteAccountOnServer } from './accountApi'
import { reportNonFatal } from '../lib/report'
import { useI18n } from '../i18n'
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'

export type AuthUser = {
  /** Firebase UID — also the key for the user's data in Firestore. */
  id: string
  name: string | null
  email: string
  photo: string | null
  /** Guest (anonymous Firebase) session — real uid, no Google identity yet. */
  isAnonymous: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  /** true while Firebase restores the persisted session on launch. */
  initializing: boolean
  signingIn: boolean
  /** Human-readable reason the last sign-in attempt failed, if any. */
  error: string | null
  signIn: () => Promise<void>
  /** Start an anonymous (guest) session — solve first, sign in later. */
  signInGuest: () => Promise<void>
  signOut: () => Promise<void>
  /** Permanently removes the account and every chat. Throws on failure. */
  deleteAccount: () => Promise<void>
  /** How many guest problems were just carried into an existing account on
   *  sign-in (null when nothing was carried). Cleared once surfaced. */
  carried: number | null
  clearCarried: () => void
}

// The OAuth 2.0 *Web* client ID (from google-services.json / Firebase console).
// Google Sign-In needs it to mint the idToken that Firebase Auth verifies.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

const AuthContext = createContext<AuthContextValue | null>(null)

function toAuthUser(u: {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  isAnonymous: boolean
}): AuthUser {
  return { id: u.uid, name: u.displayName, email: u.email ?? '', photo: u.photoURL, isAnonymous: u.isAnonymous }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [carried, setCarried] = useState<number | null>(null)

  // Professional consumer pattern: the app NEVER gates on sign-in. Whenever
  // there is no session (first launch, sign-out, account deletion), we silently
  // create an anonymous one and drop the user straight into the product; their
  // work saves under the anonymous uid and carries over when they later link
  // Google. One attempt per "null" event — if it fails (offline first launch),
  // initializing ends and the Welcome fallback renders with manual options.
  const autoAnonInFlight = useRef(false)

  useEffect(() => {
    if (WEB_CLIENT_ID) GoogleSignin.configure({ webClientId: WEB_CLIENT_ID })
    // Firebase persists the session natively; this fires immediately with the
    // restored user (or null) and again on every sign-in/out.
    return onAuthStateChanged(getAuth(), (u) => {
      if (u) {
        autoAnonInFlight.current = false
        setUser(toAuthUser(u))
        setInitializing(false)
        return
      }
      setUser(null)
      if (!autoAnonInFlight.current) {
        autoAnonInFlight.current = true
        setInitializing(true) // hold the boot frame instead of flashing a gate
        signInAnonymously(getAuth()).catch(() => {
          // Offline / disabled — fall through to the manual Welcome fallback.
          autoAnonInFlight.current = false
          setInitializing(false)
        })
      } else {
        setInitializing(false)
      }
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const signIn = async () => {
      if (!WEB_CLIENT_ID) {
        setError('Google Sign-In is not configured yet (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing).')
        return
      }
      setSigningIn(true)
      setError(null)
      try {
        await GoogleSignin.hasPlayServices()
        const response = await GoogleSignin.signIn()
        // response.type is 'cancelled' when the user backs out - not an error
        if (isSuccessResponse(response)) {
          // Google's own profile data — needed below because LINKING an anonymous
          // user does NOT copy the provider profile onto the account.
          const gUser = response.data.user
          // RNFirebase's native credential requires BOTH tokens; the signIn()
          // response only carries idToken, so fetch the pair via getTokens()
          const { idToken, accessToken } = await GoogleSignin.getTokens()
          if (!idToken) throw new Error('Google returned no ID token - check the Web client ID.')
          const credential = GoogleAuthProvider.credential(idToken, accessToken)
          const current = getAuth().currentUser
          if (current?.isAnonymous) {
            // Guest upgrading: LINK the Google identity onto the anonymous
            // account — same uid, so everything already saved carries over.
            try {
              await linkWithCredential(current, credential)
            } catch (linkErr) {
              const code = (linkErr as { code?: string }).code ?? ''
              if (/credential-already-in-use|email-already-in-use/.test(code)) {
                // This Google account already exists, so linking is impossible
                // and we must SWITCH to it. The guest's work is moved
                // SERVER-SIDE first (docs + photos, guest tree deleted), and
                // only a successful move lets the switch happen: on failure
                // the user STAYS a guest with everything intact and simply
                // retries online — nothing is ever silently lost.
                let moved = 0
                try {
                  const guestToken = await getIdToken(current)
                  moved = await migrateGuestWork(guestToken, idToken)
                } catch (migErr) {
                  reportNonFatal(migErr, 'migrate-guest')
                  setError(t('auth.migrateBlocked'))
                  return
                }
                await signInWithCredential(getAuth(), credential)
                if (moved > 0) setCarried(moved)
              } else {
                throw linkErr
              }
            }
          } else {
            await signInWithCredential(getAuth(), credential)
          }

          // Post sign-in fixups for the LINK path (harmless on the others):
          // 1. Linking keeps the anonymous (empty) profile — backfill name/photo
          //    from Google so the account actually shows who's signed in.
          const fresh = getAuth().currentUser
          if (fresh && (!fresh.displayName || !fresh.photoURL)) {
            try {
              await updateProfile(fresh, {
                displayName: fresh.displayName ?? gUser.name ?? undefined,
                photoURL: fresh.photoURL ?? gUser.photo ?? undefined,
              })
              await reload(fresh)
            } catch {
              // profile polish is best-effort — never block the sign-in on it
            }
          }
          // 2. Linking does NOT fire onAuthStateChanged (same user), so push the
          //    updated user into React state by hand.
          const now = getAuth().currentUser
          if (now) setUser(toAuthUser(now))
        }
      } catch (e) {
        if (isErrorWithCode(e)) {
          if (e.code === statusCodes.IN_PROGRESS) return
          if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            setError('Google Play Services is not available on this device.')
            return
          }
        }
        setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.')
      } finally {
        setSigningIn(false)
      }
    }

    const signInGuest = async () => {
      setSigningIn(true)
      setError(null)
      try {
        // A real Firebase session with a real uid — the AI proxy and Firestore
        // rules work unchanged, and the per-user rate limit applies.
        await signInAnonymously(getAuth())
        // onAuthStateChanged updates `user`
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not start a guest session. Please try again.')
      } finally {
        setSigningIn(false)
      }
    }

    const signOut = async () => {
      try {
        await GoogleSignin.signOut()
      } catch {
        // Google session may already be gone; Firebase sign-out still proceeds
      }
      await firebaseSignOut(getAuth())
    }

    const deleteAccount = async () => {
      const fbUser = getAuth().currentUser
      if (!fbUser) return

      // Destruction demands proof of recent presence: get a fresh Google
      // credential (silently when possible), re-authenticate, then force-mint
      // an ID token so it carries the new auth_time — the server rejects
      // deletion on sign-ins older than 5 minutes.
      try {
        await GoogleSignin.signInSilently()
      } catch {
        await GoogleSignin.hasPlayServices()
        await GoogleSignin.signIn()
      }
      const { idToken, accessToken } = await GoogleSignin.getTokens()
      await reauthenticateWithCredential(fbUser, GoogleAuthProvider.credential(idToken, accessToken))
      const freshToken = await getIdToken(fbUser, true)

      // The server (Admin SDK) wipes EVERYTHING in one place — Storage,
      // Firestore, the auth user — including photos that were migrated in
      // from a guest session. That's the Play data-deletion promise kept.
      await deleteAccountOnServer(freshToken)

      // The account is gone server-side; drop every local trace and session.
      await clearLocalImages()
      try {
        await GoogleSignin.signOut()
      } catch {
        // Google-side session cleanup is best-effort
      }
      // Local session only — the user record is already deleted. Signing out
      // fires onAuthStateChanged(null) -> a fresh guest session attaches.
      await firebaseSignOut(getAuth()).catch(() => {})
    }

    return {
      user,
      initializing,
      signingIn,
      error,
      signIn,
      signInGuest,
      signOut,
      deleteAccount,
      carried,
      clearCarried: () => setCarried(null),
    }
  }, [user, initializing, signingIn, error, carried, t])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
