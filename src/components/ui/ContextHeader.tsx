import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import RezIcon, { type RezIconName } from './RezIcon'
import { APP_CONTENT_MAX_WIDTH, APP_GUTTER } from './ScreenContent'
import Txt from './Txt'

type HeaderAction = {
  icon: RezIconName
  label: string
  onPress: () => void
  disabled?: boolean
}

/**
 * App bar for nested / focused work. Replaces AppHeader when the user enters
 * a solution, exercise session or settings — location and a reliable back
 * button matter more than global nav here.
 */
export default function ContextHeader({
  eyebrow,
  title,
  onBack,
  backLabel,
  action,
}: {
  eyebrow: string
  title: string
  onBack: () => void
  backLabel: string
  action?: HeaderAction
}) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors

  return (
    <View style={[styles.host, { paddingTop: insets.top + 8 }]}>
      <View style={styles.inner}>
        <Press
          onPress={onBack}
          pressDepth={2.5}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={[styles.control, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
        >
          <RezIcon name="back" size={19} color={c.text} accent={c.bubblyRed} />
        </Press>

        <View style={styles.copy}>
          <Txt
            numberOfLines={1}
            size={10}
            color={c.bubblyRed}
            style={[styles.eyebrow, { fontFamily: theme.font.mono }]}
          >
            {eyebrow}
          </Txt>
          <Txt
            numberOfLines={1}
            style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}
          >
            {title}
          </Txt>
        </View>

        {action ? (
          <Press
            onPress={action.onPress}
            disabled={action.disabled}
            pressDepth={2.5}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={[
              styles.control,
              { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark, borderBottomColor: c.bubblyRedDark },
              action.disabled && styles.disabled,
            ]}
          >
            <RezIcon name={action.icon} size={18} color="#FFFFFF" accent={c.bubblyYellow} />
          </Press>
        ) : (
          <View style={styles.controlPlaceholder} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    flexShrink: 0,
    paddingBottom: 10,
    paddingHorizontal: APP_GUTTER,
  },
  inner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: APP_CONTENT_MAX_WIDTH,
    minHeight: 46,
    width: '100%',
  },
  control: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderBottomWidth: 3.5,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  controlPlaceholder: {
    height: 44,
    width: 44,
  },
  copy: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 14,
  },
  eyebrow: {
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.5,
    lineHeight: 22,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.38,
  },
})
