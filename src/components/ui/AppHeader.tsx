import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../auth/AuthProvider'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import ProfessorMark from './ProfessorMark'
import RezIcon from './RezIcon'
import { APP_CONTENT_MAX_WIDTH, APP_GUTTER } from './ScreenContent'
import Txt from './Txt'

/**
 * Top-level header shared across Home, Subjects, Preparation, Notebook.
 * Brand lockup (mascot + wordmark) on the left, account button on the right.
 * Deliberately quiet so the screen content is the hero.
 */
export default function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { theme } = useTheme()
  const { user, signingIn } = useAuth()
  const insets = useSafeAreaInsets()
  const c = theme.colors

  return (
    <View style={[styles.host, { paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}>
            <ProfessorMark avatar style={styles.professor} />
          </View>
          <Txt style={[styles.name, { color: c.text, fontFamily: theme.font.display }]}>
            Profu' de Mate
          </Txt>
        </View>

        <Press
          onPress={onOpenSettings}
          pressDepth={2.5}
          accessibilityRole="button"
          accessibilityLabel="Deschide contul și setările"
          hitSlop={6}
          style={[styles.account, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
        >
          {signingIn ? (
            <ActivityIndicator size="small" color={c.bubblyRed} />
          ) : user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <RezIcon name="user" size={21} color={c.text} accent={c.bubblyRed} />
          )}
        </Press>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    flexShrink: 0,
    paddingBottom: 8,
    paddingHorizontal: APP_GUTTER,
  },
  inner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: APP_CONTENT_MAX_WIDTH,
    minHeight: 48,
    width: '100%',
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  mark: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 52,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 52,
  },
  professor: { height: 56, width: 56 },
  name: { fontSize: 24, letterSpacing: -0.7, lineHeight: 28 },
  account: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  avatar: { borderRadius: 12, height: 34, width: 34 },
})
