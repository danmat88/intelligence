import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AntDesign, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import BrandGradient from '../components/ui/BrandGradient'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'

/** Sign-in gate shown before the chat: brand mark + "Continue with Google". */
export default function WelcomeScreen() {
  const { theme, mode } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { signIn, signingIn, error } = useAuth()

  return (
    <ScreenBackground>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <BrandGradient style={styles.mark}>
            <Ionicons name="sparkles" size={34} color={c.onAccent} />
          </BrandGradient>
          <Txt size={36} style={{ letterSpacing: -1, fontFamily: theme.font.display }}>
            Intelligence
          </Txt>
          <Txt size={16} color={c.textMuted} style={styles.tagline}>
            Your AI assistant for ideas, answers and everything in between.
          </Txt>
        </View>

        <View style={styles.footer}>
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
                  Continue with Google
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
              Sign in to start chatting. Your conversations stay on this device.
            </Txt>
          )}
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  mark: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  tagline: { textAlign: 'center', lineHeight: 23, maxWidth: 300 },
  footer: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 },
  googleBtn: {
    height: 56,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  error: { textAlign: 'center', lineHeight: 18, paddingHorizontal: 12 },
})
