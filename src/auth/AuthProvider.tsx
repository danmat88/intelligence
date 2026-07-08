import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth'
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
}

type AuthContextValue = {
  user: AuthUser | null
  /** true while Firebase restores the persisted session on launch. */
  initializing: boolean
  signingIn: boolean
  /** Human-readable reason the last sign-in attempt failed, if any. */
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
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
}): AuthUser {
  return { id: u.uid, name: u.displayName, email: u.email ?? '', photo: u.photoURL }
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
          await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken, accessToken))
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

    const signOut = async () => {
      try {
        await GoogleSignin.signOut()
      } catch {
        // Google session may already be gone; Firebase sign-out still proceeds
      }
      await firebaseSignOut(getAuth())
    }

    return { user, initializing, signingIn, error, signIn, signOut }
  }, [user, initializing, signingIn, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
