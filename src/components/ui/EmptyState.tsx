import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import PrimaryAction from './PrimaryAction'
import RezIcon, { type RezIconName } from './RezIcon'
import Txt from './Txt'

type Props = {
  icon: RezIconName
  title: string
  message: string
  action?: {
    title: string
    icon: RezIconName
    onPress: () => void
  }
}

/**
 * Full-screen empty state with a large icon badge, title, message, and
 * optional primary CTA button. Used in Notebook tabs and Subjects when no
 * data is available.
 */
export default function EmptyState({ icon, title, message, action }: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={styles.root}>
      <View style={[styles.iconWrap, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark }]}>
        <RezIcon name={icon} size={32} color={c.text} accent={c.bubblyRed} />
      </View>
      <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>{title}</Txt>
      <Txt size={13.5} color={c.textMuted} style={styles.message}>{message}</Txt>
      {action && (
        <View style={styles.action}>
          <PrimaryAction title={action.title} icon={action.icon} onPress={action.onPress} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 4,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  title: {
    fontSize: 21,
    letterSpacing: -0.5,
    lineHeight: 26,
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 360,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
})
