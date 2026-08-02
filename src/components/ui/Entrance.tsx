import type { ReactNode } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeInDown, useReducedMotion } from 'react-native-reanimated'

/**
 * A short, non-blocking entrance used for top-level content groups.
 * It runs on the UI thread and disappears entirely when reduced motion is on.
 */
export default function Entrance({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode
  delay?: number
  style?: StyleProp<ViewStyle>
}) {
  const reduceMotion = useReducedMotion()
  const entering = reduceMotion
    ? undefined
    : FadeInDown
        .duration(300)
        .delay(delay)
        .easing(Easing.out(Easing.cubic))

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  )
}
