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
        <View style={[styles.badge, { backgroundColor: c.text }]}>
          <RezIcon name="alert" size={21} color="#fff" accent="#FFB4B8" />
        </View>
        <Txt size={19} style={{ fontFamily: theme.font.display, letterSpacing: -0.3 }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={styles.message}>
          {message}
        </Txt>
        <View style={styles.row}>
          <Press onPress={onClose} scaleTo={0.97} containerStyle={styles.flex} style={[styles.btn, { backgroundColor: c.surfaceAlt }]}>
            <Txt weight="semibold" size={14.5} color={c.textMuted}>
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
            <Txt weight="semibold" size={14.5} color="#FFFFFF">
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
    padding: 24,
    gap: 10,
    shadowColor: '#15121F',
    shadowOpacity: 0.24,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  badge: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  message: { lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
  btn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
})
