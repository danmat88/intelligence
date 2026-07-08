import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Image, StyleSheet, View } from 'react-native'
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

/**
 * Boot choreography - one continuous scene, no cuts, no layout shift:
 * 1. Native splash: pure background colour, held while fonts + session load.
 * 2. It fades into an identical JS frame (undetectable - same plain colour),
 *    then the logo and wordmark make their entrance together, in space that
 *    is already reserved, so nothing ever moves around them.
 * 3. A beat, then the app cross-fades in: chat if signed in, Google sign-in
 *    if not.
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
    <SafeAreaProvider>
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
  const [introDone, setIntroDone] = useState(false)
  const ready = fontsLoaded && !initializing

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {}) // fades into BootScreen
  }, [ready])

  if (!introDone) return <BootScreen ready={ready} onFinish={() => setIntroDone(true)} />

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

/**
 * Starts as a plain twin of the native splash (just the background colour).
 * Once `ready`, the logo and the wordmark enter together - opacity and a
 * gentle settle only, into pre-reserved space: zero layout shift.
 */
function BootScreen({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const logo = useRef(new Animated.Value(0)).current
  const name = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!ready) return
    Animated.parallel([
      Animated.timing(logo, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(name, { toValue: 1, duration: 420, delay: 160, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(onFinish, 600)
    })
  }, [ready, logo, name, onFinish])

  return (
    <View style={styles.boot}>
      <Animated.View
        style={{
          opacity: logo,
          transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        <Image source={require('./assets/splash-icon.png')} style={styles.mark} resizeMode="contain" />
      </Animated.View>
      <Animated.View
        style={{
          opacity: name,
          transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}
      >
        <Animated.Text style={styles.wordmark}>Intelligence</Animated.Text>
      </Animated.View>
    </View>
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
  boot: { flex: 1, backgroundColor: BOOT_BG, alignItems: 'center', justifyContent: 'center', gap: 18 },
  mark: { width: 150, height: 150 },
  wordmark: {
    color: '#111114',
    fontSize: 26,
    letterSpacing: -0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
})
