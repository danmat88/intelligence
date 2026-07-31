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
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
        <View style={[styles.badge, { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark, borderBottomColor: c.bubblyRedDark }]}>
          <RezIcon name="alert" size={22} color="#fff" accent={c.bubblyYellow} />
        </View>
        <Txt size={20} style={{ fontFamily: theme.font.display, letterSpacing: -0.4 }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={styles.message}>
          {message}
        </Txt>
        <View style={styles.row}>
          <Press onPress={onClose} pressDepth={3.5} containerStyle={styles.flex} style={[styles.btn, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
            <Txt weight="bold" size={15} color={c.textMuted}>
              {cancelLabel}
            </Txt>
          </Press>
          <Press
            onPress={() => {
              onClose()
              onConfirm()
            }}
            pressDepth={3.5}
            containerStyle={styles.flex}
            style={[styles.btn, { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark, borderBottomColor: c.bubblyRedDark }]}
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
    borderRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 5.5,
    padding: 24,
    gap: 10,
  },
  badge: { width: 50, height: 50, borderRadius: 18, borderWidth: 2, borderBottomWidth: 3.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  message: { lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
  btn: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4.5, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
})
