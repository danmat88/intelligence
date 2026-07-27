import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import RezIcon, { type RezIconName } from './RezIcon'
import Txt from './Txt'

export default function PanelHeader({
  eyebrow,
  title,
  icon,
  onClose,
  closeLabel,
  dark = false,
}: {
  eyebrow: string
  title: string
  icon: RezIconName
  onClose: () => void
  closeLabel: string
  dark?: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const ink = dark ? '#FFFFFF' : c.text
  const muted = dark ? 'rgba(255,255,255,0.48)' : c.textFaint

  return (
    <>
      <View style={[styles.grab, { backgroundColor: dark ? 'rgba(255,255,255,0.18)' : c.border }]} />
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: dark ? 'rgba(255,255,255,0.09)' : c.accentSoft }]}>
          <RezIcon name={icon} size={19} color={dark ? '#A995FF' : c.accent} accent={dark ? '#A995FF' : c.accent} />
        </View>
        <View style={styles.copy}>
          <Txt size={9} color={muted} style={[styles.eyebrow, { fontFamily: theme.font.mono }]}>
            {eyebrow}
          </Txt>
          <Txt style={[styles.title, { color: ink, fontFamily: theme.font.display }]}>{title}</Txt>
        </View>
        <Press
          onPress={onClose}
          hitSlop={6}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={[styles.close, { backgroundColor: dark ? 'rgba(255,255,255,0.09)' : c.surfaceAlt }]}
        >
          <RezIcon name="close" size={17} color={dark ? 'rgba(255,255,255,0.72)' : c.textMuted} accent={c.accent} />
        </Press>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  grab: { alignSelf: 'center', borderRadius: 2, height: 3, marginBottom: 12, width: 30 },
  row: { alignItems: 'center', flexDirection: 'row', marginBottom: 14, minHeight: 42 },
  icon: { alignItems: 'center', borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  copy: { flex: 1, marginLeft: 10 },
  eyebrow: { letterSpacing: 1.05 },
  title: { fontSize: 20, letterSpacing: -0.55, lineHeight: 23, marginTop: 1 },
  close: { alignItems: 'center', borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
})
