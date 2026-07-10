import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Micro cross-fade for swapping small UI clusters (e.g. the header's
 * "Sign in" pill ↔ avatar) without a hard cut: when `dep` changes, the old
 * content fades out (110ms), swaps, and the new content fades in (170ms).
 */
export default function CrossFade({
  dep,
  children,
  style,
}: {
  dep: string | number | boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const opacity = useRef(new Animated.Value(1)).current
  const [content, setContent] = useState<ReactNode>(children)
  const depRef = useRef(dep)
  const latest = useRef(children)
  latest.current = children

  useEffect(() => {
    if (depRef.current === dep) {
      setContent(children) // same state, just fresher props — no animation
      return
    }
    depRef.current = dep
    Animated.timing(opacity, { toValue: 0, duration: 110, useNativeDriver: true }).start(() => {
      setContent(latest.current)
      Animated.timing(opacity, { toValue: 1, duration: 170, useNativeDriver: true }).start()
    })
  }, [dep, children, opacity])

  return <Animated.View style={[style, { opacity }]}>{content}</Animated.View>
}
