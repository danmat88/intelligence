import { StyleSheet, View } from 'react-native'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import { useTheme } from '../theme/ThemeProvider'
import type { MainDestination } from './types'

const TabItem = ({ item, focused, onPress, onLongPress }: any) => {
  const { theme } = useTheme()
  const c = theme.colors

  // Active items pop up slightly and get a colored circle behind them
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: withSpring(focused ? -14 : 0, { damping: 14, stiffness: 250 }) }],
    }
  })

  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(focused ? 1 : 0, { damping: 14, stiffness: 250 }) }],
      opacity: withTiming(focused ? 1 : 0, { duration: 150 }),
    }
  })

  // Ensure incredible contrast
  const iconColor = focused ? c.text : c.textMuted
  const textColor = focused ? c.text : c.textMuted
  const accentColor = focused ? c.textMuted : item.color

  return (
    <Press
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      style={styles.slot}
    >
      <View style={styles.itemContainer}>
        {/* The active colored blob */}
        <Animated.View
          style={[
            styles.activeBlob,
            { backgroundColor: item.color, borderColor: c.border },
            animatedBgStyle
          ]}
        />

        {/* The Icon */}
        <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
          <RezIcon
            name={item.icon}
            size={focused ? 24 : 26}
            color={iconColor}
            accent={accentColor}
            strokeWidth={2.5}
          />
        </Animated.View>

        {/* The Text */}
        <Txt
          weight={focused ? 'extrabold' : 'bold'}
          size={11.5}
          color={textColor}
          style={{ marginTop: 2, fontFamily: theme.font.display, opacity: focused ? 1 : 0.8 }}
        >
          {item.label}
        </Txt>
      </View>
    </Press>
  )
}

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

  const destinations: Record<MainDestination, { label: string; icon: RezIconName; color: string }> = examMode
    ? {
        Acasa: { label: 'Acasă', icon: 'home', color: c.bubblyBlue },
        Exercitii: { label: 'Exerciții', icon: 'practice', color: c.bubblyGreen },
        Biblioteca: { label: 'Subiecte', icon: 'document', color: c.bubblyRed },
        Activitate: { label: 'Rezultate', icon: 'verified', color: c.bubblyYellow },
      }
    : {
        Acasa: { label: 'Acasă', icon: 'home', color: c.bubblyBlue },
        Exercitii: { label: 'Exerciții', icon: 'practice', color: c.bubblyGreen },
        Biblioteca: { label: 'Istoric', icon: 'history', color: c.bubblyRed },
        Activitate: { label: 'Salvate', icon: 'bookmark', color: c.bubblyYellow },
      }

  const renderDestination = (name: MainDestination) => {
    const found = byName.get(name)
    if (!found) return null
    const { route, index } = found
    const item = destinations[name]
    const focused = state.index === index

    return (
      <TabItem
        key={route.key}
        item={item}
        focused={focused}
        onPress={() => {
          const navEvent = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !navEvent.defaultPrevented) navigation.navigate(route.name, route.params)
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      />
    )
  }

  return (
    <View
      style={[
        styles.host,
        {
          backgroundColor: c.bgElevated,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.inner}>
        {renderDestination('Acasa')}
        {renderDestination('Exercitii')}

        {/* Central Solve Button */}
        <View style={styles.solveContainer}>
          <Press
            onPress={onSolve}
            pressDepth={8}
            style={[styles.solveButton, { backgroundColor: c.accent, borderColor: c.border }]}
          >
            <RezIcon name="solve" size={32} color="#FFFFFF" accent={c.bubblyYellow} strokeWidth={2.5} />
          </Press>
          <Txt weight="extrabold" size={13} color={c.text} style={{ fontFamily: theme.font.display, marginTop: 'auto' }}>
            Rezolvă
          </Txt>
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
    paddingTop: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    zIndex: 2,
  },
  activeBlob: {
    position: 'absolute',
    top: -14, // Exact match with the translateY of the icon
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 5,
    zIndex: 1,
  },
  solveContainer: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 72,
    paddingBottom: 2,
  },
  solveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    borderBottomWidth: 8,
    position: 'absolute',
    top: -30,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
})
