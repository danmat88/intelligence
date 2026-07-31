import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Overlay from './Overlay'
import Press from './Press'
import RezIcon from './RezIcon'
import Txt from './Txt'

/**
 * Small informational dialog on the app's own overlay engine: icon tile,
 * display-face title, body, one filled button. Used for the verify-badge
 * explainer (the product's trust pitch, told at the moment of trust).
 */
export default function InfoDialog({
  open,
  tone = 'success',
  title,
  message,
  okLabel,
  onClose,
}: {
  open: boolean
  /** success = green check tile, warning = amber alert tile. */
  tone?: 'success' | 'warning'
  title: string
  message: string
  okLabel: string
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <Overlay open={open} onClose={onClose} align="center">
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
        <View style={[styles.badge, { backgroundColor: tone === 'success' ? c.bubblyGreen : c.bubblyYellow, borderColor: tone === 'success' ? c.bubblyGreenDark : c.bubblyYellowDark, borderBottomColor: tone === 'success' ? c.bubblyGreenDark : c.bubblyYellowDark }]}>
          <RezIcon name={tone === 'success' ? 'verified' : 'alert'} size={22} color="#fff" accent="#FFFFFF" />
        </View>
        <Txt size={20} style={{ fontFamily: theme.font.display, letterSpacing: -0.4 }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={styles.message}>
          {message}
        </Txt>
        <Press onPress={onClose} pressDepth={3.5} style={[styles.btn, { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }]}>
          <Txt weight="bold" size={15} color="#FFFFFF">
            {okLabel}
          </Txt>
        </Press>
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
  btn: { marginTop: 12, borderRadius: 18, borderWidth: 2, borderBottomWidth: 4.5, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
})
