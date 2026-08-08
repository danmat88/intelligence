import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SystemBars } from 'react-native-edge-to-edge'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated'
import { initAppCheck } from './src/lib/appcheck'
import { initTelemetryConsent } from './src/lib/telemetry'
import { ThemeProvider } from './src/theme/ThemeProvider'
import { I18nProvider } from './src/i18n'
import { AuthProvider } from './src/auth/AuthProvider'
import ErrorBoundary from './src/components/ErrorBoundary'
import GlobalBackground from './src/components/ui/GlobalBackground'
import { ToastProvider } from './src/components/ui/Toast'
import AppNavigator from './src/navigation/AppNavigator'
import PreAppFlow from './src/screens/PreAppFlow'
import { OverlayHostProvider } from './src/components/ui/OverlayHost'
import { ProductProvider } from './src/product/ProductProvider'
import { AppLifecycleProvider, useAppLifecycle } from './src/navigation/AppLifecycleProvider'
/**
 * Boot choreography is used only once, on a cold app launch:
 * 1. Native splash holds the paper colour only until brand fonts are ready.
 * 2. The JS lockup assembles immediately and absorbs auth/profile loading.
 * 3. The real destination mounts underneath; when ready, the scene reveals it.
 *
 * Authentication is a normal in-app transition. It must never re-enter this
 * boot flow, otherwise a sign-in/sign-out looks like the app restarted.
 */
SplashScreen.preventAutoHideAsync().catch(() => {})
SplashScreen.setOptions({ fade: true, duration: 120 })

// App integrity attestation starts warming immediately — the first solve
// request wants a cached token, not a cold fetch. No-op on builds without
// the native module.
initAppCheck()
void initTelemetryConsent()

const BOOT_BG = '#FFF8E7'

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    Inter_800ExtraBold: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
    SpaceGrotesk_500Medium: require('@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf'),
    SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
    Fraunces_400Regular: require('@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf'),
    Fraunces_500Medium: require('@expo-google-fonts/fraunces/500Medium/Fraunces_500Medium.ttf'),
    Fraunces_600SemiBold: require('@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf'),
    Fraunces_600SemiBold_Italic: require('@expo-google-fonts/fraunces/600SemiBold_Italic/Fraunces_600SemiBold_Italic.ttf'),
    Nunito_600SemiBold: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
    Nunito_700Bold: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
    Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
    Nunito_900Black: require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'),
    Kalam_700Bold: require('@expo-google-fonts/kalam/700Bold/Kalam_700Bold.ttf'),
    JetBrainsMono_500Medium: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
    JetBrainsMono_600SemiBold: require('@expo-google-fonts/jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf'),
  })

  return (
    <SafeAreaProvider style={styles.boot}>
      <SystemBars
        style={{ statusBar: 'dark', navigationBar: 'dark' }}
        hidden={{ statusBar: false, navigationBar: false }}
      />
      <ErrorBoundary>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <ThemeProvider>
            <GlobalBackground />
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>
                  {/* A font failure must DEGRADE (system faces), never hold the
                      splash forever — ready would otherwise stay false. */}
                  <ProductProvider>
                    <AppLifecycleProvider>
                      <OverlayHostProvider>
                        <Root fontsLoaded={fontsLoaded || !!fontError} />
                      </OverlayHostProvider>
                    </AppLifecycleProvider>
                  </ProductProvider>
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
  const { launchReady } = useAppLifecycle()
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false)
  const [launchFinished, setLaunchFinished] = useState(false)

  useEffect(() => {
    if (!fontsLoaded || nativeSplashHidden) return

    let active = true
    SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => {
        // Mount the JS launch scene only after the native layer has yielded.
        // Otherwise its entrance animation can finish invisibly behind Android.
        if (active) setNativeSplashHidden(true)
      })

    return () => {
      active = false
    }
  }, [fontsLoaded, nativeSplashHidden])

  const appOpacity = useSharedValue(0)
  const appStyle = useAnimatedStyle(() => ({
    opacity: appOpacity.value
  }))

  const handleRevealApp = useCallback(() => {
    appOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }, () => {
      runOnJS(setLaunchFinished)(true)
    })
  }, [appOpacity])

  if (!fontsLoaded || !nativeSplashHidden) return null

  return (
    <View style={styles.flex}>
      {/* 1. The Main Application (handles its own auth routing) */}
      <Animated.View pointerEvents={launchFinished ? 'auto' : 'none'} style={[styles.flex, appStyle]}>
        <AppNavigator />
      </Animated.View>

      {/* 2. Cold Boot Splash Overlay */}
      {!launchFinished && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <PreAppFlow
            readyToReveal={launchReady}
            onRevealApp={handleRevealApp}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: BOOT_BG },
  flex: { flex: 1 },
})
