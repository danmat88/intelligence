import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInAnonymously,
  signInWithCredential,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth'
import { collection, deleteDoc, doc, getDocs, getFirestore } from '@react-native-firebase/firestore'
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
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (WEB_CLIENT_ID) GoogleSignin.configure({ webClientId: WEB_CLIENT_ID })
    // Firebase persists the session natively; this fires immediately with the
    // restored user (or null) and again on every sign-in/out.
    return onAuthStateChanged(getAuth(), (u) => {
      setUser(u ? toAuthUser(u) : null)
      setInitializing(false)
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
              // This Google account already exists — switch to it instead
              // (the guest scratch work stays behind on the orphaned uid).
              if (/credential-already-in-use|email-already-in-use/.test(code)) {
                await signInWithCredential(getAuth(), credential)
              } else {
                throw linkErr
              }
            }
          } else {
            await signInWithCredential(getAuth(), credential)
          }
          // onAuthStateChanged updates `user`
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

      // Firebase demands a recent login for destructive operations - get a
      // fresh Google credential (silently when possible) and re-authenticate.
      try {
        await GoogleSignin.signInSilently()
      } catch {
        await GoogleSignin.hasPlayServices()
        await GoogleSignin.signIn()
      }
      const { idToken, accessToken } = await GoogleSignin.getTokens()
      await reauthenticateWithCredential(fbUser, GoogleAuthProvider.credential(idToken, accessToken))

      // Play policy: deleting the account must delete the data. Wipe every
      // saved problem, then the user doc.
      const db = getFirestore()
      const problems = await getDocs(collection(doc(db, 'users', fbUser.uid), 'problems'))
      await Promise.all(problems.docs.map((p) => deleteDoc(p.ref)))
      await deleteDoc(doc(db, 'users', fbUser.uid)).catch(() => {}) // in case a user doc ever exists

      await fbUser.delete() // also signs out -> onAuthStateChanged clears `user`
      try {
        await GoogleSignin.signOut()
      } catch {
        // Google-side session cleanup is best-effort
      }
    }

    return { user, initializing, signingIn, error, signIn, signInGuest, signOut, deleteAccount }
  }, [user, initializing, signingIn, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
