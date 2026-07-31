import { StyleSheet, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import { useTheme } from '../theme/ThemeProvider'
import type { MainDestination } from './types'

const destinations: Record<MainDestination, { label: string; icon: RezIconName }> = {
  Azi: { label: 'Azi', icon: 'home' },
  Subiecte: { label: 'Subiecte', icon: 'exam-en' },
  Exerseaza: { label: 'Exersează', icon: 'practice' },
  Caiet: { label: 'Caiet', icon: 'document' },
}

export default function MainNavigation({
  state,
  descriptors,
  navigation,
  onSolve,
}: BottomTabBarProps & { onSolve: () => void }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors
  const byName = new Map(state.routes.map((route, index) => [route.name, { route, index }]))

  const renderDestination = (name: MainDestination) => {
    const found = byName.get(name)
    if (!found) return null
    const { route, index } = found
    const item = destinations[name]
    const focused = state.index === index
    const options = descriptors[route.key]?.options

    return (
      <Press
        key={route.key}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params)
          }
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        accessibilityRole="tab"
        accessibilityLabel={options?.tabBarAccessibilityLabel ?? item.label}
        accessibilityState={{ selected: focused }}
        containerStyle={styles.slot}
        style={styles.destination}
      >
        <RezIcon
          name={item.icon}
          size={20}
          color={focused ? c.accent : c.textFaint}
          accent={focused ? c.accent : c.textFaint}
          strokeWidth={focused ? 2.1 : 1.8}
        />
        <Txt weight={focused ? 'bold' : 'semibold'} size={10.5} color={focused ? c.text : c.textFaint}>
          {item.label}
        </Txt>
        {focused && <View style={[styles.active, { backgroundColor: c.accent }]} />}
      </Press>
    )
  }

  return (
    <View
      style={[
        styles.host,
        {
          backgroundColor: c.bgElevated,
          borderTopColor: c.text,
          borderTopWidth: 2,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.inner} accessibilityRole="tablist">
        {renderDestination('Azi')}
        {renderDestination('Subiecte')}
        <View style={styles.solveSlot}>
          <Press
            onPress={onSolve}
            pressDepth={4}
            accessibilityRole="button"
            accessibilityLabel="Rezolvă o problemă"
            style={[styles.solve, { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark, borderBottomColor: c.bubblyRedDark }]}
          >
            <RezIcon name="solve" size={25} color="#FFFFFF" accent={c.bubblyYellow} strokeWidth={2.1} />
          </Press>
          <Txt weight="bold" size={11} color={c.text}>Rezolvă</Txt>
        </View>
        {renderDestination('Exerseaza')}
        {renderDestination('Caiet')}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    borderTopWidth: 2,
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  inner: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    maxWidth: 720,
    width: '100%',
  },
  slot: { flex: 1 },
  destination: {
    alignItems: 'center',
    gap: 3,
    height: 52,
    justifyContent: 'center',
    minWidth: 54,
  },
  active: {
    borderRadius: 99,
    bottom: 0,
    height: 4,
    position: 'absolute',
    width: 24,
  },
  solveSlot: { alignItems: 'center', flex: 1, gap: 2, minWidth: 58 },
  solve: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5.5,
    height: 52,
    justifyContent: 'center',
    marginTop: -15,
    width: 56,
  },
})
