import type { ReactNode } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

/**
 * Tactile feedback entirely on the UI thread. Fast taps cancel the previous
 * response instead of stacking animations and delaying the next action.
 */
export default function Press({
  style,
  containerStyle,
  scaleTo = 0.965,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  scaleTo?: number
  children?: ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const pressed = useSharedValue(0)

  const move = (to: number) => {
    cancelAnimation(pressed)
    pressed.value = reduceMotion
      ? to
      : withTiming(to, { duration: to ? 90 : 170, easing: Easing.out(Easing.cubic) })
  }

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressed.value * 1.25 },
      { scale: 1 - pressed.value * (1 - scaleTo) },
    ],
  }))

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(event) => {
        if (!rest.disabled) move(1)
        rest.onPressIn?.(event)
      }}
      onPressOut={(event) => {
        move(0)
        rest.onPressOut?.(event)
      }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  )
}
