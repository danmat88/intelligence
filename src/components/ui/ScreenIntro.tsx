import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import type { RezIconName } from './RezIcon'
import RezIcon from './RezIcon'
import Txt from './Txt'

export default function ScreenIntro({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string
  title: string
  icon: RezIconName
}) {
  const { theme } = useTheme()
  const { height } = useWindowDimensions()
  const compact = height < 760
  const c = theme.colors

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <View style={[styles.signal, { backgroundColor: c.accent }]} />
          <Txt size={9.5} color={c.accent} style={[styles.eyebrow, { fontFamily: theme.font.mono }]}>
            {eyebrow}
          </Txt>
        </View>
        <Txt
          numberOfLines={1}
          maxFontSizeMultiplier={1.12}
          style={[
            styles.title,
            compact && styles.titleCompact,
            { color: c.text, fontFamily: theme.font.display },
          ]}
        >
          {title}
        </Txt>
      </View>
      <View style={[styles.iconStage, { backgroundColor: c.sunny, borderColor: c.text, shadowColor: c.text }]}>
        <RezIcon name={icon} size={23} color={c.text} accent={c.accent} strokeWidth={1.95} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingTop: 3,
  },
  rootCompact: { minHeight: 52 },
  copy: { flex: 1, paddingRight: 14 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  signal: { borderRadius: 99, height: 5, width: 5 },
  eyebrow: { letterSpacing: 1.08 },
  title: { fontSize: 29, letterSpacing: -1.35, lineHeight: 34, marginTop: 4 },
  titleCompact: { fontSize: 26, lineHeight: 30 },
  iconStage: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    transform: [{ rotate: '3deg' }],
    width: 44,
  },
})
