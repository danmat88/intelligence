import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'

import Entrance from '../components/ui/Entrance'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'

/**
 * First onboarding step for signed-out users. The brand occupies the exact
 * same header position as onboarding and the workspace, so the launch lockup
 * can land here without a cut or a duplicated logo.
 */
export default function WelcomeScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { signIn, signInGuest, signingIn, error } = useAuth()

  return (
    <ScreenBackground>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
        <View style={{ height: 64 }} />

        <View style={styles.body}>
          <Entrance delay={80}>
            <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>Hai să începem.</Txt>
            <Txt size={15} color={c.textMuted} style={styles.copy}>
              Intră cu Google ca să-ți păstrezi munca sau încearcă aplicația imediat.
            </Txt>
          </Entrance>

          <Entrance delay={150} style={styles.actions}>
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

          {error ? (
            <Txt size={13} color={c.danger} style={styles.hint}>
              {error}
            </Txt>
          ) : (
            <Txt size={13} color={c.textFaint} style={styles.hint}>
              Poți începe imediat. Contul îți păstrează problemele.
            </Txt>
          )}

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
          </Entrance>
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 18 },
  body: { flex: 1, justifyContent: 'center', marginTop: 16 },
  title: { fontSize: 35, letterSpacing: -1.25, lineHeight: 40, textAlign: 'center' },
  copy: { alignSelf: 'center', lineHeight: 21, marginTop: 8, maxWidth: 380, textAlign: 'center' },
  actions: { alignSelf: 'center', gap: 14, marginTop: 34, maxWidth: 420, width: '100%' },

  // Google button — dark ink 3D push-down
  googleBtn: {
    alignItems: 'center',
    borderRadius: 24,
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
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 64,
  },
})
