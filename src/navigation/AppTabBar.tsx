import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import type { AppTab } from './types'

type Props = { activeTab: AppTab; onChange: (tab: AppTab) => void }

const tabs: { key: AppTab; label: string; icon: RezIconName }[] = [
  { key: 'home', label: 'Acasă', icon: 'home' },
  { key: 'solve', label: 'Rezolvă', icon: 'solve' },
  { key: 'practice', label: 'Pregătire', icon: 'practice' },
]

export default function AppTabBar({ activeTab, onChange }: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors

  return (
    <View style={[styles.stage, { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.dock, { backgroundColor: c.text, shadowColor: c.text }]} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          return (
            <Press
              key={tab.key}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              containerStyle={styles.slot}
              style={[styles.tab, active && { backgroundColor: c.surface }]}
            >
              <RezIcon name={tab.icon} size={18} color={active ? c.text : 'rgba(255,255,255,0.48)'} accent={active ? c.accent : 'rgba(255,255,255,0.48)'} />
              <Txt weight="bold" size={11.5} color={active ? c.text : 'rgba(255,255,255,0.56)'}>{tab.label}</Txt>
              {active && <View style={[styles.activeSignal, { backgroundColor: c.accent }]} />}
            </Press>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: { paddingHorizontal: 14, paddingTop: 7 },
  dock: {
    alignSelf: 'center',
    borderRadius: 23,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 520,
    padding: 4,
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    width: '100%',
  },
  slot: { flex: 1 },
  tab: { alignItems: 'center', borderRadius: 19, flexDirection: 'row', gap: 7, height: 47, justifyContent: 'center', overflow: 'hidden' },
  activeSignal: { borderRadius: 999, bottom: 4, height: 3, position: 'absolute', width: 16 },
})
