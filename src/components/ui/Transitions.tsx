import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Motion primitives for user-caused state changes - nothing here loops or
 * plays on its own; each fires exactly once when its trigger changes.
 */

/** Re-fades its content whenever `dep` changes (e.g. switching chats). */
export function FadeSwitch({ dep, children }: { dep: string; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    opacity.setValue(0)
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
  }, [dep, opacity])
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>
}

/** Mounts/unmounts with a quick fade + scale, instead of popping. */
export function Appear({
  visible,
  style,
  children,
}: {
  visible: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(visible)
  const v = useRef(new Animated.Value(visible ? 1 : 0)).current
  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.spring(v, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }).start()
    } else {
      Animated.timing(v, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setMounted(false))
    }
  }, [visible, v])
  if (!mounted) return null
  return (
    <Animated.View
      style={[
        style,
        { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** One-shot fade-and-rise on mount (for rows/blocks that arrive). */
export function RiseIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(6)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start()
  }, [opacity, y])
  return <Animated.View style={[style, { opacity, transform: [{ translateY: y }] }]}>{children}</Animated.View>
}
