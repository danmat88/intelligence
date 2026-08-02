import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Overlay from './Overlay'
import Press from './Press'
import RezIcon from './RezIcon'
import Txt from './Txt'

/**
 * Themed confirmation on the app's own overlay engine: centered card with an
 * alert icon tile, display-face title, filled ghost cancel and filled
 * destructive confirm — reads as one designed object, not a stock alert.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Șterge',
  cancelLabel = 'Anulează',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <Overlay open={open} onClose={onClose} align="center">
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge }]}>
        <View style={[styles.badge, { backgroundColor: c.bubblyRed, borderColor: c.border, borderBottomColor: c.border }]}>
          <RezIcon name="alert" size={22} color="#FFFFFF" accent={c.bubblyYellow} />
        </View>
        <Txt size={20} style={{ fontFamily: theme.font.display, letterSpacing: -0.4 }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={styles.message}>
          {message}
        </Txt>
        <View style={styles.row}>
          <Press onPress={onClose} pressDepth={5} containerStyle={styles.flex} style={[styles.btn, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge }]}>
            <Txt weight="bold" size={15} color={c.textMuted}>
              {cancelLabel}
            </Txt>
          </Press>
          <Press
            onPress={() => {
              onClose()
              onConfirm()
            }}
            pressDepth={5}
            containerStyle={styles.flex}
            style={[styles.btn, { backgroundColor: c.bubblyRed, borderColor: c.border, borderBottomColor: c.border }]}
          >
            <Txt weight="bold" size={15} color="#FFFFFF">
              {confirmLabel}
            </Txt>
          </Press>
        </View>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    borderWidth: 3,
    borderBottomWidth: 8,
    padding: 26,
    gap: 10,
  },
  badge: { width: 56, height: 56, borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  message: { lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
  btn: { borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
})
