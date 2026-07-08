import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Overlay from './Overlay'
import Txt from './Txt'

/**
 * Themed confirmation on the app's own overlay engine: centered card,
 * display-face title, ghost cancel, filled destructive confirm.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <Overlay open={open} onClose={onClose} align="center">
      <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border, borderRadius: theme.radius.lg }]}>
        <Txt size={18} style={{ fontFamily: theme.font.display }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={{ lineHeight: 21 }}>
          {message}
        </Txt>
        <View style={styles.row}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.btn, { borderColor: c.border, borderWidth: 1, opacity: pressed ? 0.6 : 1 }]}
          >
            <Txt weight="semibold" size={14.5} color={c.textMuted}>
              Cancel
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => {
              onClose()
              onConfirm()
            }}
            style={({ pressed }) => [styles.btn, { backgroundColor: c.danger, opacity: pressed ? 0.75 : 1 }]}
          >
            <Txt weight="semibold" size={14.5} color="#FFFFFF">
              {confirmLabel}
            </Txt>
          </Pressable>
        </View>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 400, borderWidth: 1, padding: 22, gap: 10 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
})
