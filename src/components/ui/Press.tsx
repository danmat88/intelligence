import { useRef, type ReactNode } from 'react'
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

/**
 * The app's standard press feedback: a quick 0.96 scale + slight dim, spring
 * back on release. Motion-spec rule: buttons respond with depth, never with
 * an opacity-only blink. The visual style goes on the inner view; the
 * Pressable itself stays unstyled so hitSlop/layout behave like before.
 */
export default function Press({
  style,
  containerStyle,
  scaleTo = 0.96,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>
  /** Layout styles for the outer Pressable (flex/margins in a row). */
  containerStyle?: StyleProp<ViewStyle>
  scaleTo?: number
  children?: ReactNode
}) {
  const p = useRef(new Animated.Value(0)).current
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 0 }).start()
        rest.onPressIn?.(e)
      }}
      onPressOut={(e) => {
        Animated.spring(p, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 5 }).start()
        rest.onPressOut?.(e)
      }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] }) }],
            opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }),
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}
