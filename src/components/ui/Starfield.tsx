import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

type Star = {
  x: number // percent
  y: number
  size: number
  duration: number
  delay: number
  drift: number
}

/**
 * A field of tiny twinkling, slowly drifting particles behind hero content.
 * Pure native-driver opacity/transform loops - costs nothing per frame.
 */
export default function Starfield({ count = 16 }: { count?: number }) {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.5 + Math.random() * 2.2,
        duration: 2200 + Math.random() * 3800,
        delay: Math.random() * 3000,
        drift: 6 + Math.random() * 14,
      })),
    [count],
  )

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Twinkle key={i} star={s} />
      ))}
    </View>
  )
}

function Twinkle({ star }: { star: Star }) {
  const { theme } = useTheme()
  const v = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(star.delay),
        Animated.timing(v, { toValue: 1, duration: star.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: star.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, star])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: star.size,
        height: star.size,
        borderRadius: star.size,
        backgroundColor: theme.mode === 'dark' ? '#C8CCFF' : theme.colors.accent,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.75] }),
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -star.drift] }) }],
      }}
    />
  )
}
