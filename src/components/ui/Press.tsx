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
 * Rezolvo's tactile feedback, entirely on the UI thread. A new touch cancels
 * the previous response, so fast taps cannot pile up springs or stall a page
 * transition. Controls move into the surface; they never blink or fade.
 */
export default function Press({
  style,
  containerStyle,
  scaleTo = 0.975,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>
  /** Layout styles for the outer Pressable (flex/margins in a row). */
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
