import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../../theme/ThemeProvider'
import BrandLockup from './BrandLockup'
import Txt from './Txt'

/**
 * The Profu’ de Mate lockup: professor mark + wordmark, with an
 * optional tagline. It is shown on boot and on the sign-in screen so the mark
 * never changes identity between first touchpoints.
 */
export default function BrandMark({
  tagline,
  onEntered,
}: {
  tagline?: string
  onEntered?: () => void
}) {
  const { theme } = useTheme()
  const reduceMotion = useReducedMotion()
  const mark = useRef(new Animated.Value(0)).current

  const entered = useRef(onEntered)
  entered.current = onEntered

  useEffect(() => {
    Animated.sequence([
      Animated.timing(mark, { toValue: 1.08, duration: reduceMotion ? 1 : 360, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
      Animated.spring(mark, { toValue: 1, damping: 11, stiffness: 190, mass: 0.55, useNativeDriver: true }),
    ]).start(() => entered.current?.())
  }, [mark, reduceMotion])

  return (
    <View style={styles.hero}>
      <Animated.View
        style={{
          opacity: mark.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { scale: mark },
            { rotate: mark.interpolate({ inputRange: [0, 1.08], outputRange: ['-5deg', '1deg'] }) },
          ],
        }}
      >
        <BrandLockup variant="hero" />
      </Animated.View>

      {tagline ? (
        <Txt size={16} color={theme.colors.textMuted} style={styles.tagline}>
          {tagline}
        </Txt>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  tagline: { textAlign: 'center', lineHeight: 23, maxWidth: 300 },
})
