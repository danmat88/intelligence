import { StyleSheet, View, type ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'

type Props = {
  eyebrow: string
  title: string
  description?: string
  trailing?: React.ReactNode
  style?: ViewStyle
}

/**
 * Section hero heading used at the top of browsing screens.
 * Big, bold title with a mono kicker and an optional trailing action.
 */
export default function ScreenHeading({
  eyebrow,
  title,
  description,
  trailing,
  style,
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={[styles.row, style]}>
      <View style={styles.copy}>
        <Txt size={11} weight="bold" color={c.bubblyRed} style={[styles.eyebrow, { fontFamily: theme.font.mono }]}>
          {eyebrow}
        </Txt>
        <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>
          {title}
        </Txt>
        {!!description && (
          <Txt size={14} color={c.textMuted} style={styles.description}>
            {description}
          </Txt>
        )}
      </View>
      {trailing}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-end', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingBottom: 4 },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { letterSpacing: 1.3 },
  title: { fontSize: 34, letterSpacing: -1.2, lineHeight: 38, marginTop: 4 },
  description: { lineHeight: 20, marginTop: 5, maxWidth: 560 },
})
