import { useRef, type ReactNode } from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * Tactile feedback entirely on the UI thread. A fixed, very short timing is
 * used instead of a spring so controls never remain visually "pressed".
 *
 * By default, actions are deferred until the release animation finishes visually
 * on the UI thread, ensuring heavy JS tasks (like navigation) never freeze the button.
 */
export default function Press({
  style,
  containerStyle,
  scaleTo = 0.985,
  pressDepth = 2,
  deferAction = true,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  scaleTo?: number
  pressDepth?: number
  deferAction?: boolean
  children?: ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const pressed = useSharedValue(0)
  const effectiveDepth = Math.min(Math.max(pressDepth, 0), 8)

  const actionEvent = useRef<any>(null)
  const actionCallback = useRef<((e: any) => void) | null>(null)

  const onAnimationComplete = () => {
    if (actionCallback.current) {
      const cb = actionCallback.current
      const ev = actionEvent.current
      actionCallback.current = null
      actionEvent.current = null
      cb(ev)
    }
  }

  const move = (to: number) => {
    cancelAnimation(pressed)
    pressed.value = reduceMotion
      ? to
      : withTiming(to, {
          duration: to === 1 ? 42 : 72,
          easing: Easing.out(Easing.quad),
        }, (finished) => {
          if (finished && to === 0) {
            runOnJS(onAnimationComplete)()
          }
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
        // Clear any pending actions if pressed again before animation completes
        actionCallback.current = null
        actionEvent.current = null

        if (!rest.disabled) move(1)
        rest.onPressIn?.(event)
      }}
      onPressOut={(event) => {
        move(0)
        rest.onPressOut?.(event)
      }}
      onPress={(event) => {
        if (!rest.onPress) return

        if (deferAction) {
          actionEvent.current = event
          actionCallback.current = rest.onPress
          if (reduceMotion) {
            onAnimationComplete()
          }
        } else {
          requestAnimationFrame(() => {
            rest.onPress?.(event)
          })
        }
      }}
    >
      {children}
    </AnimatedPressable>
  )
}
