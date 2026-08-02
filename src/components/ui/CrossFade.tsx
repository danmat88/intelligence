import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1)

/**
 * Immediate content swap with a subtle arrival cue. Children render in the
 * same React pass as `dep`; animation is decoration and never gates mounting.
 */
export default function CrossFade({
  dep,
  children,
  style,
  axis = 'y',
  duration = 170,
}: {
  dep: string | number | boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  axis?: 'x' | 'y'
  duration?: number
}) {
  const reduceMotion = useReducedMotion()
  const offset = useSharedValue(0)
  const opacity = useSharedValue(1)

  useEffect(() => {
    cancelAnimation(offset)
    cancelAnimation(opacity)
    if (reduceMotion) {
      offset.value = 0
      opacity.value = 1
      return
    }
    offset.value = 12
    opacity.value = 0.92
    offset.value = withTiming(0, { duration, easing: EASE_OUT })
    opacity.value = withTiming(1, { duration: Math.min(duration, 140), easing: EASE_OUT })
  }, [dep, duration, offset, opacity, reduceMotion])

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: axis === 'x' ? [{ translateX: offset.value }] : [{ translateY: offset.value }],
  }))

  return (
    <View style={[style, styles.clip]}>
      <Animated.View style={[styles.fill, animated]}>{children}</Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
})
