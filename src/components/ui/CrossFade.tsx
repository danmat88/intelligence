import { useEffect, useRef, type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  withTiming,
  type EntryAnimationsValues,
  type ExitAnimationsValues,
} from 'react-native-reanimated'

/** House curve: decisive start, long soft landing. */
const EASE = Easing.bezier(0.22, 1, 0.36, 1)

/**
 * Push transition for state changes inside a fixed slot (hero ↔ thread,
 * camera ↔ trim, session phases). When `dep` changes, the old subtree slides
 * fully out one edge while the new slides fully in from the other — both
 * 100% opaque, clipped by the slot (design rule: content never fades or
 * ghosts; it MOVES). Runs entirely on the UI thread via Reanimated
 * entering/exiting, so a busy JS thread (mounting heavy content) can no
 * longer stall or stutter the motion.
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
  const entering = (v: EntryAnimationsValues) => {
    'worklet'
    return {
      initialValues: {
        originX: v.targetOriginX + (axis === 'x' ? v.targetWidth : 0),
        originY: v.targetOriginY + (axis === 'y' ? v.targetHeight : 0),
      },
      animations: {
        originX: withTiming(v.targetOriginX, { duration, easing: EASE }),
        originY: withTiming(v.targetOriginY, { duration, easing: EASE }),
      },
    }
  }
  const exiting = (v: ExitAnimationsValues) => {
    'worklet'
    return {
      initialValues: { originX: v.currentOriginX, originY: v.currentOriginY },
      animations: {
        originX: withTiming(v.currentOriginX - (axis === 'x' ? v.currentWidth : 0), { duration, easing: EASE }),
        originY: withTiming(v.currentOriginY - (axis === 'y' ? v.currentHeight : 0), { duration, easing: EASE }),
      },
    }
  }

  // No entrance on the very first mount — a fresh slot shows its content in
  // place; only real STATE CHANGES travel (otherwise every mount would ride
  // on top of whatever bigger motion brought the slot on screen).
  const first = useRef(true)
  useEffect(() => {
    first.current = false
  }, [])

  // Keyed child: a dep change unmounts the old subtree (exiting keeps it on
  // screen, sliding out) and mounts the new one (entering slides it in).
  return (
    <View style={[style, styles.clip]}>
      <Animated.View
        key={String(dep)}
        style={styles.fill}
        entering={first.current ? undefined : entering}
        exiting={exiting}
      >
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
})
