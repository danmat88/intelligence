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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Tactile feedback entirely on the UI thread. A fixed, very short timing is
 * used instead of a spring so controls never remain visually "pressed" while
 * the next screen is already opening.
 *
 * Layout and visuals intentionally live on the same native node. Keeping flex,
 * percentage width or absolute positioning on an animated child makes the
 * outer Pressable collapse to its intrinsic size, which in turn clips labels
 * and breaks sibling layout.
 */
export default function Press({
  style,
  containerStyle,
  scaleTo = 0.985,
  pressDepth = 2,
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
  const effectiveDepth = Math.min(Math.max(pressDepth, 0), 8)

  const move = (to: number) => {
    cancelAnimation(pressed)
    pressed.value = reduceMotion
      ? to
      : withTiming(to, {
          duration: to === 1 ? 42 : 72,
          easing: Easing.out(Easing.quad),
        })
  }

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: pressed.value * effectiveDepth },
      { scale: 1 - pressed.value * (1 - scaleTo) },
    ],
  }))

  return (
    <AnimatedPressable
      {...rest}
      unstable_pressDelay={0}
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
