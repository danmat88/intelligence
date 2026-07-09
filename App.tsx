import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
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
import { ThemeProvider } from './src/theme/ThemeProvider'
import { AuthProvider, useAuth } from './src/auth/AuthProvider'
import { ChatProvider } from './src/chat/store'
import ErrorBoundary from './src/components/ErrorBoundary'
import { ToastProvider } from './src/components/ui/Toast'
import ChatScreen from './src/screens/ChatScreen'
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

const BOOT_BG = '#FAFAFC' // matches the native splash and the app background

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  })

  return (
    <SafeAreaProvider style={styles.boot}>
      <ErrorBoundary>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <Root fontsLoaded={fontsLoaded} />
              </AuthProvider>
            </ToastProvider>
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
  // the brand beat; signing in from the welcome screen cross-fades straight to
  // chat (the mark is already on screen - no need to replay it).
  const bootedSignedIn = useRef<boolean | null>(null)

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {}) // fades into the JS frame below
  }, [ready])

  // Plain twin of the native splash, held until fonts + session are ready.
  if (!ready) return <View style={styles.boot} />

  if (bootedSignedIn.current === null) bootedSignedIn.current = !!user

  // Cold start while signed in: a brief brand beat, then the app.
  if (user && bootedSignedIn.current && !beatDone) {
    return (
      <View style={styles.boot}>
        <BrandMark onEntered={() => setTimeout(() => setBeatDone(true), 500)} />
      </View>
    )
  }

  return (
    <FadeIn key={user ? 'app' : 'welcome'}>
      {user ? (
        <ChatProvider>
          <ChatScreen />
        </ChatProvider>
      ) : (
        <WelcomeScreen />
      )}
    </FadeIn>
  )
}

function FadeIn({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }).start()
  }, [opacity])
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: BOOT_BG },
})
