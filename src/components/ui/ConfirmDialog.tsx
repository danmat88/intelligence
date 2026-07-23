import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import IconTile from './IconTile'
import Overlay from './Overlay'
import Press from './Press'
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
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
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
      <View style={[styles.card, { backgroundColor: c.bgElevated }]}>
        <View pointerEvents="none" style={[styles.signal, { backgroundColor: c.danger }]} />
        <IconTile name="alert" size={48} iconSize={22} tone="danger" />
        <Txt size={9} color={c.danger} style={{ fontFamily: theme.font.mono, letterSpacing: 1.1 }}>ACȚIUNE SENSIBILĂ</Txt>
        <Txt size={19} style={{ fontFamily: theme.font.display, letterSpacing: -0.3 }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={styles.message}>
          {message}
        </Txt>
        <View style={styles.row}>
          <Press onPress={onClose} scaleTo={0.97} containerStyle={styles.flex} style={[styles.btn, { backgroundColor: c.surfaceAlt }]}>
            <Txt weight="semibold" size={14.5} color={c.textMuted} style={{ fontFamily: theme.font.displayMedium }}>
              {cancelLabel}
            </Txt>
          </Press>
          <Press
            onPress={() => {
              onClose()
              onConfirm()
            }}
            scaleTo={0.97}
            containerStyle={styles.flex}
            style={[styles.btn, { backgroundColor: c.danger }]}
          >
            <Txt weight="semibold" size={14.5} color="#FFFFFF" style={{ fontFamily: theme.font.displayMedium }}>
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
    borderRadius: 30,
    overflow: 'hidden',
    padding: 24,
    gap: 10,
    shadowColor: '#15121F',
    shadowOpacity: 0.24,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  signal: { bottom: 0, left: 0, position: 'absolute', top: 0, width: 5 },
  message: { lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
  btn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
})
