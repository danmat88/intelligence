import { useRef } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AntDesign } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
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
  const { t } = useI18n()

  // Revealed by BrandMark's onEntered, so the button appears after the lockup.
  const footer = useRef(new Animated.Value(0)).current
  const revealFooter = () => {
    Animated.timing(footer, { toValue: 1, duration: 560, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start()
  }

  return (
    <ScreenBackground>
      <StatusBar style="dark" />

      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <BrandMark tagline={t('welcome.tagline')} onEntered={revealFooter} />

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
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: theme.radius.pill,
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed && !signingIn ? 0.98 : 1 }],
              },
            ]}
          >
            {signingIn ? (
              <ActivityIndicator color={c.text} />
            ) : (
              <>
                <AntDesign name="google" size={20} color={c.text} />
                <Txt weight="semibold" size={16}>
                  {t('welcome.google')}
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
              {t('welcome.caption')}
            </Txt>
          )}

          <Pressable
            onPress={signInGuest}
            disabled={signingIn}
            hitSlop={8}
            style={({ pressed }) => [styles.tryBtn, { opacity: pressed || signingIn ? 0.5 : 1 }]}
          >
            <Txt weight="semibold" size={14} color={c.accent}>
              {t('welcome.guest')}
            </Txt>
          </Pressable>
        </Animated.View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28 },
  footer: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 },
  googleBtn: {
    height: 56,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#1A1626',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  error: { textAlign: 'center', lineHeight: 18, paddingHorizontal: 12 },
  tryBtn: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10 },
})
