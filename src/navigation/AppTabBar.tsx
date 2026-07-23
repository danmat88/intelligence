import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../theme/ThemeProvider'
import IconTile from '../components/ui/IconTile'
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
              onPress={() => {
                if (!active) Haptics.selectionAsync().catch(() => {})
                onChange(tab.key)
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              containerStyle={styles.slot}
              style={[styles.tab, active && styles.tabActive]}
            >
              {active ? (
                <IconTile name={tab.icon} size={30} iconSize={15} selected />
              ) : (
                <View style={styles.iconRest}><RezIcon name={tab.icon} size={18} color="rgba(255,255,255,0.48)" accent="#A995FF" /></View>
              )}
              <Txt weight="bold" size={11.5} color={active ? '#fff' : 'rgba(255,255,255,0.5)'} style={{ fontFamily: theme.font.displayMedium, letterSpacing: -0.15 }}>{tab.label}</Txt>
              {active && <View style={styles.activeSignal} />}
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
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    padding: 4,
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    width: '100%',
  },
  slot: { flex: 1 },
  tab: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 7, height: 49, justifyContent: 'center', overflow: 'hidden' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  iconRest: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
  activeSignal: { backgroundColor: '#9CFFCC', borderRadius: 999, height: 5, position: 'absolute', right: 9, top: 8, width: 5 },
})
