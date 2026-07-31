import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import Txt from './Txt'

export type Segment<T extends string> = {
  value: T
  label: string
}

/**
 * 3D pill-shaped segmented tab control. Active segment pops up with bubblyYellow
 * background and a thick bottom edge. Inactive tabs are plain but pressable.
 */
export default function SegmentedControl<T extends string>({
  value,
  segments,
  onChange,
  accessibilityLabel,
}: {
  value: T
  segments: Segment<T>[]
  onChange: (value: T) => void
  accessibilityLabel: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: '#F0E6CE', borderColor: '#D6C9AA' }]}
    >
      {segments.map((segment) => {
        const selected = segment.value === value
        return (
          <Press
            key={segment.value}
            onPress={() => onChange(segment.value)}
            pressDepth={2.5}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            containerStyle={styles.slot}
            style={[
              styles.segment,
              selected
                ? {
                    backgroundColor: c.bubblyYellow,
                    borderColor: c.bubblyYellowDark,
                    borderBottomColor: c.bubblyYellowDark,
                    borderBottomWidth: 3.5,
                  }
                : { borderColor: 'transparent' },
            ]}
          >
            <Txt
              numberOfLines={1}
              weight="bold"
              size={13}
              color={selected ? c.text : c.textMuted}
            >
              {segment.label}
            </Txt>
          </Press>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 5,
    padding: 5,
  },
  slot: { flex: 1 },
  segment: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
  },
})
