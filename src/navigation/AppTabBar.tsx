import { memo, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../theme/ThemeProvider'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import type { AppTab } from './types'

type Props = { activeTab: AppTab; onChange: (tab: AppTab) => void; visible?: boolean }

const tabs: { key: AppTab; label: string; icon: RezIconName }[] = [
  { key: 'home', label: 'Acasă', icon: 'home' },
  { key: 'solve', label: 'Rezolvă', icon: 'solve' },
  { key: 'practice', label: 'Pregătire', icon: 'practice' },
]

function AppTabBar({ activeTab, onChange, visible = true }: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const shown = useSharedValue(visible ? 1 : 0)
  const c = theme.colors
  const bottom = Math.max(insets.bottom, 10)
  const dockHeight = 61 + bottom

  useEffect(() => {
    shown.value = reduceMotion
      ? visible ? 1 : 0
      : withTiming(visible ? 1 : 0, {
          duration: visible ? 280 : 220,
          easing: visible ? Easing.bezier(0.22, 1, 0.36, 1) : Easing.in(Easing.cubic),
        })
  }, [reduceMotion, shown, visible])

  const shellMotion = useAnimatedStyle(() => ({
    height: dockHeight * shown.value,
  }))
  const dockMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: dockHeight * (1 - shown.value) }],
  }))

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.shell, { backgroundColor: c.bg }, shellMotion]}
    >
      <Animated.View style={[styles.stage, { paddingBottom: bottom }, dockMotion]}>
        <View style={[styles.dock, { backgroundColor: c.text, borderColor: c.sunny, shadowColor: c.text }]} accessibilityRole="tablist">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <Press
                key={tab.key}
                onPress={() => onChange(tab.key)}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
                containerStyle={styles.slot}
                style={[styles.tab, active && { backgroundColor: c.sunny }]}
              >
                <RezIcon name={tab.icon} size={18} color={active ? c.text : 'rgba(255,255,255,0.58)'} accent={active ? c.accent : 'rgba(255,255,255,0.58)'} />
                <Txt weight="bold" size={11.5} color={active ? c.text : 'rgba(255,255,255,0.56)'}>{tab.label}</Txt>
                {active && <View style={[styles.activeSignal, { backgroundColor: c.accent }]} />}
              </Press>
            )
          })}
        </View>
      </Animated.View>
    </Animated.View>
  )
}

export default memo(AppTabBar)

const styles = StyleSheet.create({
  shell: { flexShrink: 0, overflow: 'hidden' },
  stage: { paddingHorizontal: 14, paddingTop: 7 },
  dock: {
    alignSelf: 'center',
    borderWidth: 2,
    borderRadius: 23,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 520,
    padding: 4,
    shadowOpacity: 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 5 },
    elevation: 10,
    width: '100%',
  },
  slot: { flex: 1 },
  tab: { alignItems: 'center', borderRadius: 19, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center', overflow: 'hidden' },
  activeSignal: { borderRadius: 999, bottom: 4, height: 3, position: 'absolute', width: 18 },
})
