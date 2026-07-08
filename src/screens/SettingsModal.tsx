import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Overlay from '../components/ui/Overlay'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'

/**
 * Bottom-sheet settings: profile, appearance, sign out, and the permanent
 * account deletion the Play Store requires of apps with sign-in.
 */
export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { user, signOut, deleteAccount } = useAuth()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!user) return null

  const doDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount() // success -> auth gate returns to Welcome
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not delete account - try again.', 'alert-triangle')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Overlay open={open} onClose={onClose} align="bottom">
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 20 },
          ]}
        >
        <View style={styles.head}>
          <Txt weight="extrabold" size={20} style={{ letterSpacing: -0.3 }}>
            Settings
          </Txt>
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Feather name="x" size={22} color={c.textMuted} />
          </Pressable>
        </View>

        {/* profile */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius.lg }]}>
          {user.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.surfaceAlt }]}>
              <Feather name="user" size={22} color={c.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Txt numberOfLines={1} weight="semibold" size={16}>
              {user.name ?? user.email}
            </Txt>
            <Txt numberOfLines={1} size={13} color={c.textFaint}>
              {user.email}
            </Txt>
          </View>
        </View>

        <Row icon="log-out" label="Sign out" onPress={() => { onClose(); signOut() }} c={c} />

        <Pressable
          onPress={() => setConfirming(true)}
          disabled={deleting}
          style={({ pressed }) => [styles.row, { opacity: pressed || deleting ? 0.6 : 1 }]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={c.danger} />
          ) : (
            <Feather name="trash-2" size={19} color={c.danger} />
          )}
          <Txt size={16} color={c.danger}>
            {deleting ? 'Deleting account…' : 'Delete account'}
          </Txt>
        </Pressable>
        <Txt size={12} color={c.textFaint} style={{ paddingHorizontal: 14, lineHeight: 17 }}>
          Deleting removes your account and all conversations permanently.
        </Txt>
        </View>
      </Overlay>

      {/* sibling of the sheet's overlay so it stacks fullscreen above it */}
      <ConfirmDialog
        open={confirming}
        title="Delete account?"
        message="This permanently deletes your account and every conversation, on all devices. There is no undo."
        confirmLabel="Delete forever"
        onConfirm={doDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

function Row({
  icon,
  label,
  onPress,
  c,
}: {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress: () => void
  c: { text: string; textMuted: string }
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={19} color={c.textMuted} />
      <Txt size={16}>{label}</Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
})
