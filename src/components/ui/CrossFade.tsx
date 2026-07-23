import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const EASE_OUT = Easing.bezier(0.4, 0, 1, 1)
const EASE_IN = Easing.bezier(0.22, 1, 0.36, 1)

/**
 * Serial opaque push for state changes inside a fixed slot. The old surface
 * leaves completely before the new one enters, so two heavy trees never move
 * or mount on top of each other. Rapid changes are coalesced to the newest
 * destination and wait for the running transition to finish.
 */
export default function CrossFade({
  dep,
  children,
  style,
  axis = 'y',
  duration = 440,
}: {
  dep: string | number | boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  axis?: 'x' | 'y'
  /** Total duration for exit + entrance. */
  duration?: number
}) {
  const key = String(dep)
  const reduceMotion = useReducedMotion()
  const latest = useRef({ key, children })
  const displayedKey = useRef(key)
  const running = useRef(false)
  const size = useRef({ width: 0, height: 0 })
  const beginRef = useRef<() => void>(() => {})
  const offset = useSharedValue(0)
  const [displayed, setDisplayed] = useState({ key, children })

  latest.current = { key, children }

  const finish = useCallback((landedKey: string) => {
    running.current = false
    setDisplayed({ key: landedKey, children: latest.current.children })
    if (latest.current.key !== landedKey) requestAnimationFrame(() => beginRef.current())
  }, [])

  const mountLatest = useCallback(() => {
    const next = latest.current
    displayedKey.current = next.key
    setDisplayed(next)
    const distance = axis === 'x' ? size.current.width : size.current.height
    offset.value = distance
    requestAnimationFrame(() => {
      offset.value = withTiming(0, { duration: Math.round(duration * 0.58), easing: EASE_IN }, (done) => {
        if (done) runOnJS(finish)(next.key)
      })
    })
  }, [axis, duration, finish, offset])

  const begin = useCallback(() => {
    if (running.current || latest.current.key === displayedKey.current) return
    const distance = axis === 'x' ? size.current.width : size.current.height
    if (reduceMotion || distance <= 0) {
      displayedKey.current = latest.current.key
      setDisplayed(latest.current)
      offset.value = 0
      return
    }
    running.current = true
    cancelAnimation(offset)
    offset.value = withTiming(-distance, { duration: Math.round(duration * 0.42), easing: EASE_OUT }, (done) => {
      if (done) runOnJS(mountLatest)()
    })
  }, [axis, duration, mountLatest, offset, reduceMotion])

  beginRef.current = begin

  useEffect(() => {
    if (key !== displayedKey.current) beginRef.current()
  }, [key])

  const onLayout = (event: LayoutChangeEvent) => {
    size.current = event.nativeEvent.layout
  }
  const animated = useAnimatedStyle(() => ({
    transform: axis === 'x' ? [{ translateX: offset.value }] : [{ translateY: offset.value }],
  }))
  const liveChildren = !running.current && displayedKey.current === key ? children : displayed.children

  return (
    <View style={[style, styles.clip]} onLayout={onLayout}>
      <Animated.View style={[styles.fill, animated]}>{liveChildren}</Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
})
