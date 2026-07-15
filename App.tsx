import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SystemBars } from 'react-native-edge-to-edge'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces'
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono'
import { initAppCheck } from './src/lib/appcheck'
import { ThemeProvider } from './src/theme/ThemeProvider'
import { I18nProvider } from './src/i18n'
import { AuthProvider, useAuth } from './src/auth/AuthProvider'
import ErrorBoundary from './src/components/ErrorBoundary'
import { ToastProvider } from './src/components/ui/Toast'
import CrossFade from './src/components/ui/CrossFade'
import SolverScreen from './src/screens/SolverScreen'
import WelcomeScreen from './src/screens/WelcomeScreen'
import BrandMark from './src/components/ui/BrandMark'

/**
 * Boot choreography - one continuous scene, no cuts, no layout shift:
 * 1. Native splash: pure background colour, held while fonts + session load.
 * 2. It fades into an identical JS frame (same plain colour). From here the
 *    same brand mark that the sign-in screen uses carries the whole intro -
 *    there is no separate placeholder icon, so the mark never changes.
 * 3. Signed out -> straight to the sign-in screen (the mark enters, then the
 *    button settles in under it). Signed in on a cold start -> a brief brand
 *    beat, then the chat cross-fades in.
 */
SplashScreen.preventAutoHideAsync().catch(() => {})
SplashScreen.setOptions({ fade: true, duration: 300 })

// App integrity attestation starts warming immediately — the first solve
// request wants a cached token, not a cold fetch. No-op on builds without
// the native module.
initAppCheck()

const BOOT_BG = '#F7F6F2' // matches the paper background

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  })

  return (
    <SafeAreaProvider style={styles.boot}>
      <SystemBars style="dark" />
      <ErrorBoundary>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <ThemeProvider>
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>
                  {/* A font failure must DEGRADE (system faces), never hold the
                      splash forever — ready would otherwise stay false. */}
                  <Root fontsLoaded={fontsLoaded || !!fontError} />
                </AuthProvider>
              </ToastProvider>
            </I18nProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}

function Root({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, initializing } = useAuth()
  const ready = fontsLoaded && !initializing
  const [beatDone, setBeatDone] = useState(false)
  // Whether the session was already signed in at cold boot. Only that case gets
  // the brand beat; signing in from the welcome screen pushes straight to
  // chat (the mark is already on screen - no need to replay it).
  const bootedSignedIn = useRef<boolean | null>(null)

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {}) // fades into the JS frame below
  }, [ready])

  // Once the app has been ready, a later not-ready spell means a session
  // switch (sign-out → fresh guest).
  const wasReady = useRef(false)
  const lastPhaseRef = useRef<'boot' | 'beat' | 'app' | 'welcome'>('boot')
  if (ready) {
    wasReady.current = true
    if (bootedSignedIn.current === null) bootedSignedIn.current = !!user
  }

  // Every phase of the session lives in ONE opaque push (house motion style):
  // boot → brand beat → app, offline welcome → app. Signing OUT never leaves
  // the app at all — no splash, no beat: the screen resets in place (thread
  // pushes back to the hero, the avatar swaps to the guest button, a toast
  // confirms) while the fresh anonymous session attaches underneath.
  let phase: 'boot' | 'beat' | 'app' | 'welcome'
  let content: ReactNode
  if (!ready && wasReady.current && lastPhaseRef.current === 'app') {
    phase = 'app'
    content = <SolverScreen />
  } else if (!ready) {
    // Plain twin of the native splash, held until fonts + session are ready.
    phase = 'boot'
    content = wasReady.current ? <BrandMark /> : null
  } else if (user && bootedSignedIn.current && !beatDone) {
    // Cold start while signed in: a brief brand beat, then the app.
    phase = 'beat'
    content = <BrandMark onEntered={() => setTimeout(() => setBeatDone(true), 500)} />
  } else if (user) {
    // Guests are real (anonymous) Firebase users, so auth state drives the
    // gate. Upgrading guest → Google LINKS the account (same uid): `user`
    // stays truthy, the phase stays 'app', and the solver never remounts —
    // work stays on screen.
    phase = 'app'
    content = <SolverScreen />
  } else {
    phase = 'welcome'
    content = <WelcomeScreen />
  }

  lastPhaseRef.current = phase

  return (
    <CrossFade dep={phase} axis="y" duration={560} style={styles.boot}>
      <View style={styles.boot}>{content}</View>
    </CrossFade>
  )
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: BOOT_BG },
})
