import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../auth/AuthProvider'
import { useTheme } from '../../theme/ThemeProvider'
import BrandLockup from './BrandLockup'
import Press from './Press'
import RezIcon from './RezIcon'
import { APP_CONTENT_MAX_WIDTH, APP_GUTTER } from './ScreenContent'

/**
 * Top-level header shared across Home, Subjects, Preparation, Notebook.
 * Brand lockup (mascot + wordmark) on the left, account button on the right.
 * The mascot and chunky controls preserve the app's classroom identity.
 */
export default function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { theme } = useTheme()
  const { user, signingIn } = useAuth()
  const insets = useSafeAreaInsets()
  const c = theme.colors

  return (
    <View style={[styles.host, { paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <BrandLockup />

        <Press
          onPress={onOpenSettings}
          pressDepth={2.5}
          accessibilityRole="button"
          accessibilityLabel="Deschide contul și setările"
          hitSlop={6}
          style={[styles.account, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge }]}
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
    minHeight: 64,
    width: '100%',
  },
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
