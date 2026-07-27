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
 * App bar for nested and focused work.
 *
 * It deliberately replaces the global wordmark/account header: once a learner
 * enters a solution or exercise, location and a reliable way back matter more
 * than global navigation.
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
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={[styles.control, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <RezIcon name="back" size={19} color={c.text} accent={c.accent} />
        </Press>

        <View style={styles.copy}>
          <Txt
            numberOfLines={1}
            size={9}
            color={c.accent}
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
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={[
              styles.control,
              { backgroundColor: c.text, borderColor: c.text },
              action.disabled && styles.disabled,
            ]}
          >
            <RezIcon name={action.icon} size={18} color="#FFFFFF" accent="#A995FF" />
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
    paddingBottom: 8,
    paddingHorizontal: APP_GUTTER,
  },
  inner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    maxWidth: APP_CONTENT_MAX_WIDTH,
    minHeight: 42,
    width: '100%',
  },
  control: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  controlPlaceholder: {
    height: 42,
    width: 42,
  },
  copy: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  eyebrow: {
    letterSpacing: 1.05,
  },
  title: {
    fontSize: 17.5,
    letterSpacing: -0.55,
    lineHeight: 21,
    marginTop: 1,
  },
  disabled: {
    opacity: 0.38,
  },
})
