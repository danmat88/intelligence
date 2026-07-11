import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Push transition for state changes inside a fixed slot (hero ↔ thread,
 * camera ↔ trim, guest pill ↔ avatar). When `dep` changes, the old subtree is
 * frozen as a top layer and BOTH layers travel together across the clipped
 * container: the old slides fully out one edge while the new slides fully in
 * from the other — everything stays 100% opaque the whole time. NO opacity,
 * NO scale — content never ghosts (design rule: only backdrop scrims may fade).
 * The swap happens in the render phase, so there is no flash frame; the live
 * children are never re-mounted mid-flight.
 */
export default function CrossFade({
  dep,
  children,
  style,
  axis = 'y',
  duration = 480,
}: {
  dep: string | number | boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Push axis: 'x' pages sideways (nav-like), 'y' advances upward. */
  axis?: 'x' | 'y'
  /** Long and calm by default — snappy transitions read as cheap. */
  duration?: number
}) {
  const progress = useRef(new Animated.Value(1)).current
  const live = useRef({ dep, node: children })
  const [outgoing, setOutgoing] = useState<ReactNode | null>(null)
  // Travel = the slot's own size, so layers clear it exactly.
  const [slot, setSlot] = useState({ w: 0, h: 0 })

  if (live.current.dep !== dep) {
    // Render-phase snapshot: React re-renders synchronously before paint,
    // so both layers land on screen in the same frame.
    setOutgoing(live.current.node)
    live.current = { dep, node: children }
  } else {
    live.current.node = children
  }

  useLayoutEffect(() => {
    if (outgoing == null) return
    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.bezier(0.22, 1, 0.36, 1), // long soft tail — glides in
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOutgoing(null)
    })
  }, [outgoing, progress, duration])

  const travel = axis === 'x' ? slot.w : slot.h
  const clamp = { extrapolate: 'clamp' as const }
  const move = (from: number, to: number) => {
    const v = progress.interpolate({ inputRange: [0, 1], outputRange: [from, to], ...clamp })
    return axis === 'x' ? [{ translateX: v }] : [{ translateY: v }]
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width !== slot.w || height !== slot.h) setSlot({ w: width, h: height })
  }

  return (
    <Animated.View style={[style, styles.clip]} onLayout={onLayout}>
      <Animated.View style={[styles.fill, { transform: move(travel, 0) }]}>{live.current.node}</Animated.View>
      {outgoing != null && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: move(0, -travel) }]}>
          {outgoing}
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
})
