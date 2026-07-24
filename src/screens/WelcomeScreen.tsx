import { useRef } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AntDesign } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import BrandMark from '../components/ui/BrandMark'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'

/**
 * Sign-in gate shown before the chat. The shared brand mark enters first (same
 * mark as the boot beat, so nothing changes shape or jumps), and only once it
 * has landed does the "Continue with Google" button settle in beneath it.
 */
export default function WelcomeScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { signIn, signInGuest, signingIn, error } = useAuth()

  // Revealed by BrandMark's onEntered, so the button appears after the lockup.
  const footer = useRef(new Animated.Value(0)).current
  const revealFooter = () => {
    Animated.timing(footer, { toValue: 1, duration: 560, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start()
  }

  return (
    <ScreenBackground>
      <StatusBar style="dark" />

      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <BrandMark tagline="Matematica devine clară." onEntered={revealFooter} />

        {/* Slides up from below the screen edge, fully opaque — no fade. */}
        <Animated.View
          style={[
            styles.footer,
            {
              transform: [{ translateY: footer.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) }],
            },
          ]}
        >
          <Pressable
            onPress={signIn}
            disabled={signingIn}
            style={({ pressed }) => [
              styles.googleBtn,
              {
                backgroundColor: c.text,
                borderColor: c.text,
                borderRadius: 18,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed && !signingIn ? 0.98 : 1 }],
              },
            ]}
          >
            {signingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <AntDesign name="google" size={20} color="#fff" />
                <Txt weight="bold" size={15.5} color="#fff">
                  Continuă cu Google
                </Txt>
              </>
            )}
          </Pressable>

          {error ? (
            <Txt size={13} color={c.danger} style={styles.error}>
              {error}
            </Txt>
          ) : (
            <Txt size={13} color={c.textFaint} style={styles.error}>
              Poți începe imediat. Contul îți păstrează problemele.
            </Txt>
          )}

          <Pressable
            onPress={signInGuest}
            disabled={signingIn}
            hitSlop={8}
            style={({ pressed }) => [styles.tryBtn, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed || signingIn ? 0.5 : 1 }]}
          >
            <Txt weight="bold" size={14} color={c.text}>
              Încearcă fără cont
            </Txt>
          </Pressable>
        </Animated.View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28 },
  footer: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 12 },
  googleBtn: {
    height: 56,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#15121F',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  error: { textAlign: 'center', lineHeight: 18, paddingHorizontal: 12 },
  tryBtn: { alignItems: 'center', alignSelf: 'stretch', borderRadius: 18, borderWidth: 1, height: 52, justifyContent: 'center' },
})
