import { StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import Overlay from './Overlay'
import Press from './Press'
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
  const tileBg = tone === 'success' ? c.successSoft : '#FFF8E6'
  const tileFg = tone === 'success' ? c.success : '#9A6700'

  return (
    <Overlay open={open} onClose={onClose} align="center">
      <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
        <View style={[styles.badge, { backgroundColor: tileBg }]}>
          <Feather name={tone === 'success' ? 'check-circle' : 'alert-triangle'} size={20} color={tileFg} />
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
    borderWidth: 1,
    borderRadius: 26,
    padding: 24,
    gap: 10,
    shadowColor: '#1A1626',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  badge: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  message: { lineHeight: 21 },
  btn: { marginTop: 12, borderRadius: 999, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
})
