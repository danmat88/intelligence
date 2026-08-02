import { StyleSheet, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import { useTheme } from '../theme/ThemeProvider'
import type { MainDestination } from './types'

export default function MainNavigation({
  state,
  descriptors,
  navigation,
  onSolve,
  examMode,
}: BottomTabBarProps & { onSolve: () => void; examMode: boolean }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors
  const byName = new Map(state.routes.map((route, index) => [route.name, { route, index }]))
  const destinations: Record<MainDestination, { label: string; icon: RezIconName }> = examMode
    ? {
        Acasa: { label: 'Acasă', icon: 'home' },
        Exercitii: { label: 'Exerciții', icon: 'practice' },
        Biblioteca: { label: 'Subiecte', icon: 'document' },
        Activitate: { label: 'Rezultate', icon: 'verified' },
      }
    : {
        Acasa: { label: 'Acasă', icon: 'home' },
        Exercitii: { label: 'Exerciții', icon: 'practice' },
        Biblioteca: { label: 'Istoric', icon: 'history' },
        Activitate: { label: 'Salvate', icon: 'bookmark' },
      }

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
        style={[
          styles.destination,
          focused && {
            backgroundColor: c.sunnySoft,
            borderColor: c.border,
            borderWidth: 3,
            borderBottomWidth: 5,
            borderRadius: 99,
          },
          !focused && { borderColor: 'transparent', borderWidth: 3, borderBottomWidth: 5, borderRadius: 99 }
        ]}
      >
        <RezIcon
          name={item.icon}
          size={focused ? 21 : 20}
          color={focused ? c.text : c.textFaint}
          accent={focused ? c.bubblyRed : c.textFaint}
          strokeWidth={focused ? 2.5 : 2}
        />
        <Txt
          weight={focused ? 'bold' : 'semibold'}
          size={focused ? 11.5 : 10.5}
          color={focused ? c.text : c.textFaint}
          style={focused ? { fontFamily: theme.font.display, letterSpacing: -0.2 } : {}}
        >
          {item.label}
        </Txt>
      </Press>
    )
  }

  return (
    <View
      style={[
        styles.host,
        {
          backgroundColor: c.bgElevated,
          borderTopColor: c.border,
          borderTopWidth: 3,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.inner} accessibilityRole="tablist">
        {renderDestination('Acasa')}
        {renderDestination('Exercitii')}
        <View style={styles.solveSlot}>
          <Press
            onPress={onSolve}
            pressDepth={6}
            accessibilityRole="button"
            accessibilityLabel="Rezolvă o problemă"
            style={[styles.solve, { backgroundColor: c.accent, borderColor: c.border, borderBottomColor: c.border }]}
          >
            <RezIcon name="solve" size={28} color="#FFFFFF" accent={c.bubblyYellow} strokeWidth={2.5} />
          </Press>
          <Txt weight="bold" size={12} color={c.text} style={{ fontFamily: theme.font.display, letterSpacing: -0.2 }}>Rezolvă</Txt>
        </View>
        {renderDestination('Biblioteca')}
        {renderDestination('Activitate')}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    borderTopWidth: 3,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
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
    gap: 2,
    height: 56,
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
  solveSlot: { alignItems: 'center', flex: 1.2, gap: 4, minWidth: 64 },
  solve: {
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 3,
    borderBottomWidth: 8,
    height: 64,
    justifyContent: 'center',
    marginTop: -22,
    width: 64,
  },
})
