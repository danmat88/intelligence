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
      <View style={[styles.card, { backgroundColor: c.bgElevated }]}>
        <View style={[styles.badge, { backgroundColor: c.text }]}>
          <RezIcon name={tone === 'success' ? 'check' : 'alert'} size={21} color="#fff" accent={tone === 'success' ? '#9CFFCC' : '#FFCF70'} />
        </View>
        <Txt size={19} style={{ fontFamily: theme.font.display, letterSpacing: -0.3 }}>
          {title}
        </Txt>
        <Txt size={14} color={c.textMuted} style={styles.message}>
          {message}
        </Txt>
        <Press onPress={onClose} scaleTo={0.97} style={[styles.btn, { backgroundColor: c.accent }]}>
          <Txt weight="semibold" size={14.5} color={c.onAccent}>
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
  btn: { marginTop: 12, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
})
