import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, type ViewProps } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/ThemeProvider'

/**
 * Full-screen backdrop: solid base + two brand "auroras" that DRIFT, breathe
 * and swell on slow out-of-phase loops, so every screen feels alive without
 * any per-frame JS (native-driver transforms only).
 */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()
  const brand = theme.gradient.brand

  const a = useDrift(9000)
  const b = useDrift(13000)

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]} {...rest}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowTop,
          {
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
            transform: [
              { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) },
              { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }) },
              { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={theme.gradient.glow as [string, string]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowBottom,
          {
            opacity: b.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }),
            transform: [
              { translateX: b.interpolate({ inputRange: [0, 1], outputRange: [20, -35] }) },
              { translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
              { scale: b.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.95] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[brand[2] + '2E', brand[2] + '00'] as [string, string]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.2, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {children}
    </View>
  )
}

/** 0↔1 forever, softly eased; each caller gets its own phase length. */
function useDrift(duration: number) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, duration])
  return v
}

const styles = StyleSheet.create({
  glowTop: { position: 'absolute', top: -120, left: -60, right: -60, height: 460, borderRadius: 460, overflow: 'hidden' },
  glowBottom: { position: 'absolute', bottom: -140, right: -80, width: 380, height: 380, borderRadius: 380, overflow: 'hidden' },
})
