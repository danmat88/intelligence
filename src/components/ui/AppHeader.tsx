import type { ReactNode } from 'react'
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../auth/AuthProvider'
import { useTheme } from '../../theme/ThemeProvider'
import CrossFade from './CrossFade'
import IconTile from './IconTile'
import Press from './Press'
import Txt from './Txt'

export default function AppHeader({ onOpenSettings, children }: { onOpenSettings: () => void; children?: ReactNode }) {
  const { theme } = useTheme()
  const { user, signingIn } = useAuth()
  const insets = useSafeAreaInsets()
  const c = theme.colors

  return (
    <View style={[styles.host, { paddingTop: insets.top + 10 }]}>
      <View style={styles.inner}>
        <View style={styles.lockup}>
          <IconTile name="solve" size={31} iconSize={17} tone="violet" />
          <Txt style={[styles.wordmark, { color: c.text, fontFamily: theme.font.display }]}>rezolvo</Txt>
        </View>
        <View style={styles.actions}>
          {children}
          <CrossFade dep={user?.isAnonymous ? 'guest' : 'account'} style={styles.accountSlot}>
            <Press
              onPress={onOpenSettings}
              hitSlop={8}
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
                <IconTile name={user?.isAnonymous ? 'user' : 'settings'} size={38} iconSize={18} tone={user?.isAnonymous ? 'ink' : 'paper'} />
              )}
            </Press>
          </CrossFade>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: { flexShrink: 0, paddingBottom: 8, paddingHorizontal: 18 },
  inner: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: 720, width: '100%' },
  lockup: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  wordmark: { fontSize: 20.5, letterSpacing: -1 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  accountSlot: { height: 38, width: 38 },
  account: { alignItems: 'center', borderRadius: 13, borderWidth: 1, height: 38, justifyContent: 'center', overflow: 'hidden', width: 38 },
  avatar: { borderRadius: 12, height: 30, width: 30 },
})
