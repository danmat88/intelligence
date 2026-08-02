import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import RezIcon, { type RezIconName } from './RezIcon'
import Txt from './Txt'

type Props = {
  title: string
  detail?: string
  icon: RezIconName
  onPress: () => void
  disabled?: boolean
  tone?: 'accent' | 'ink' | 'chalk'
}

/** Chunky, tactile primary CTA shared by the product's task flows. */
export default function PrimaryAction({
  title,
  detail,
  icon,
  onPress,
  disabled,
  tone = 'accent',
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  const background = disabled
    ? c.surfaceAlt
    : tone === 'ink'
      ? c.bubblyBlue
      : tone === 'chalk'
        ? c.bubblyGreen
        : c.bubblyRed

  const edgeColor = c.border

  const foreground = disabled ? c.textFaint : '#FFFFFF'

  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      pressDepth={7}
      accessibilityRole="button"
      style={[
        styles.action,
        {
          backgroundColor: background,
          borderColor: edgeColor,
          borderBottomColor: edgeColor,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: disabled ? c.bgElevated : 'rgba(255,255,255,0.22)' }]}>
        <RezIcon name={icon} size={22} color={foreground} accent={disabled ? c.textFaint : c.bubblyYellow} />
      </View>
      <View style={styles.copy}>
        <Txt weight="extrabold" size={17} color={foreground} style={{ fontFamily: theme.font.display }}>{title}</Txt>
        {!!detail && (
          <Txt size={12} color={disabled ? c.textFaint : 'rgba(255,255,255,0.88)'} style={styles.detail}>
            {detail}
          </Txt>
        )}
      </View>
      <View style={styles.arrowWrap}>
        <RezIcon name="arrow" size={20} color={foreground} />
      </View>
    </Press>
  )
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 14,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  copy: { flex: 1, gap: 2 },
  detail: { lineHeight: 16 },
  arrowWrap: { opacity: 0.95 },
})
