import type { ReactNode } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Tactile feedback entirely on the UI thread. Fast taps cancel the previous
 * response instead of stacking animations and delaying the next action.
 *
 * Layout and visuals intentionally live on the same native node. Keeping flex,
 * percentage width or absolute positioning on an animated child makes the
 * outer Pressable collapse to its intrinsic size, which in turn clips labels
 * and breaks sibling layout.
 */
export default function Press({
  style,
  containerStyle,
  scaleTo = 0.98,
  pressDepth = 3.5,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  scaleTo?: number
  pressDepth?: number
  children?: ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const pressed = useSharedValue(0)

  const move = (to: number) => {
    cancelAnimation(pressed)
    pressed.value = reduceMotion
      ? to
      : withSpring(to, {
          damping: 18,
          stiffness: 350,
          mass: 0.4,
        })
  }

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressed.value * pressDepth },
      { scale: 1 - pressed.value * (1 - scaleTo) },
    ],
  }))

  return (
    <AnimatedPressable
      {...rest}
      style={[style, containerStyle, animated]}
      onPressIn={(event) => {
        if (!rest.disabled) move(1)
        rest.onPressIn?.(event)
      }}
      onPressOut={(event) => {
        move(0)
        rest.onPressOut?.(event)
      }}
    >
      {children}
    </AnimatedPressable>
  )
}
