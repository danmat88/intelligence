import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../auth/AuthProvider'
import { useTheme } from '../../theme/ThemeProvider'
import CrossFade from './CrossFade'
import Press from './Press'
import ProfessorMark from './ProfessorMark'
import RezIcon from './RezIcon'
import { APP_CONTENT_MAX_WIDTH, APP_GUTTER } from './ScreenContent'
import Txt from './Txt'

/**
 * The global top-level header. Its contract is intentionally closed: every
 * primary destination gets the same brand lockup and account control, with no
 * screen-specific actions injected into this row.
 */
export default function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { theme } = useTheme()
  const { user, signingIn } = useAuth()
  const insets = useSafeAreaInsets()
  const c = theme.colors

  return (
    <View style={[styles.host, { paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <View style={styles.lockup}>
          <View style={[styles.brandGlyph, { backgroundColor: c.sunny, borderColor: c.text }]}>
            <ProfessorMark avatar style={styles.professor} />
          </View>
          <View>
            <Txt style={[styles.wordmark, { color: c.text, fontFamily: theme.font.display }]}>Profu’</Txt>
            <Txt style={[styles.wordmarkTail, { color: c.accent, fontFamily: theme.font.mono }]}>DE MATE</Txt>
          </View>
        </View>
        <CrossFade dep={user?.isAnonymous ? 'guest' : 'account'} style={styles.accountSlot}>
          <Press
            onPress={onOpenSettings}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Cont și setări"
            style={[
              styles.account,
              { backgroundColor: user?.isAnonymous ? c.text : c.surface, borderColor: user?.isAnonymous ? c.text : c.border },
            ]}
          >
            {signingIn ? (
              <ActivityIndicator size="small" color={user?.isAnonymous ? '#fff' : c.accent} />
            ) : user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <RezIcon name="user" size={18} color={user?.isAnonymous ? '#fff' : c.text} accent={c.accent} />
            )}
          </Press>
        </CrossFade>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: { flexShrink: 0, paddingBottom: 7, paddingHorizontal: APP_GUTTER },
  inner: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: APP_CONTENT_MAX_WIDTH, minHeight: 42, width: '100%' },
  lockup: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandGlyph: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '-2deg' }],
    width: 42,
  },
  professor: { height: 47, marginTop: 5, width: 47 },
  wordmark: { fontSize: 20.5, letterSpacing: -0.9, lineHeight: 20 },
  wordmarkTail: { fontSize: 8.5, letterSpacing: 1.35, lineHeight: 11 },
  accountSlot: { height: 42, width: 42 },
  account: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#193149',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    width: 42,
  },
  avatar: { borderRadius: 12, height: 32, width: 32 },
})
