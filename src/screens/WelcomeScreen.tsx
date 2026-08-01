import { useRef } from 'react'
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import BrandMark from '../components/ui/BrandMark'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'

/**
 * Sign-in gate — the very first screen a new user sees.
 * Two 3D Duolingo push-down buttons: Google (dark ink) and Guest (white).
 * Animated footer slides up after BrandMark finishes its entrance.
 */
export default function WelcomeScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { signIn, signInGuest, signingIn, error } = useAuth()

  const footer = useRef(new Animated.Value(0)).current
  const revealFooter = () => {
    Animated.timing(footer, {
      toValue: 1,
      duration: 620,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start()
  }

  return (
    <ScreenBackground>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 28 }]}>
        <BrandMark tagline="Matematica devine clară." onEntered={revealFooter} />

        <Animated.View
          style={[
            styles.footer,
            {
              opacity: footer,
              transform: [{ translateY: footer.interpolate({ inputRange: [0, 1], outputRange: [180, 0] }) }],
            },
          ]}
        >
          {/* ─── Google Sign-In ─── */}
          <Press
            onPress={signIn}
            disabled={signingIn}
            pressDepth={5}
            style={[styles.googleBtn, { backgroundColor: c.chalkDark, borderColor: '#0A2926', borderBottomColor: '#071F1D' }]}
          >
            {signingIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <View style={styles.googleCircle}>
                  <Txt weight="extrabold" size={16} color={c.chalkDark} style={styles.googleG}>G</Txt>
                </View>
                <Txt weight="bold" size={16} color="#FFFFFF">
                  Continuă cu Google
                </Txt>
              </>
            )}
          </Press>

          {/* ─── Status message ─── */}
          {error ? (
            <Txt size={13} color={c.danger} style={styles.hint}>
              {error}
            </Txt>
          ) : (
            <Txt size={13} color={c.textFaint} style={styles.hint}>
              Poți începe imediat. Contul îți păstrează problemele.
            </Txt>
          )}

          {/* ─── Guest mode ─── */}
          <Press
            onPress={signInGuest}
            disabled={signingIn}
            pressDepth={3.5}
            style={[styles.guestBtn, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
          >
            <RezIcon name="solve" size={18} color={c.text} accent={c.bubblyRed} />
            <Txt weight="bold" size={14.5} color={c.text}>
              Încearcă fără cont
            </Txt>
          </Press>
        </Animated.View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28 },
  footer: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 },

  // Google button — dark ink 3D push-down
  googleBtn: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 64,
  },
  googleCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  googleG: { textAlign: 'center' },

  // Hint text
  hint: {
    lineHeight: 18,
    paddingHorizontal: 16,
    textAlign: 'center',
  },

  // Guest button — light 3D push-down
  guestBtn: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 64,
  },
})
