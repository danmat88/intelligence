import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider'
import { AuthProvider, useAuth } from './src/auth/AuthProvider'
import { ChatProvider } from './src/chat/store'
import ErrorBoundary from './src/components/ErrorBoundary'
import { ToastProvider } from './src/components/ui/Toast'
import BrandGradient from './src/components/ui/BrandGradient'
import ChatScreen from './src/screens/ChatScreen'
import WelcomeScreen from './src/screens/WelcomeScreen'

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
              <AuthProvider>{fontsLoaded ? <Gate /> : <BootSplash />}</AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}

/** Requires a Google account before the chat: Welcome when signed out. */
function Gate() {
  const { user, initializing } = useAuth()
  if (initializing) return <BootSplash />
  // key remounts the fade on auth changes, so screens cross-fade in
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

/**
 * Animated boot moment shown while fonts load and the session restores:
 * the brand mark breathing on the dark base. Feels alive from frame one.
 */
function BootSplash() {
  const { theme } = useTheme()
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.05] })
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale }], opacity: glow }}>
        <BrandGradient
          style={{ width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="sparkles" size={40} color={theme.colors.onAccent} />
        </BrandGradient>
      </Animated.View>
    </View>
  )
}
