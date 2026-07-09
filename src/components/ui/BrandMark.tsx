import { useEffect, useRef } from 'react'
import { Animated, Image, StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'

const BRAND_SYMBOL = require('../../../assets/android-icon-foreground.png')

/**
 * The brand lockup: the launcher mark + the "Intelligence" wordmark, with an
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
  const c = theme.colors
  const mark = useRef(new Animated.Value(0)).current
  const name = useRef(new Animated.Value(0)).current

  const entered = useRef(onEntered)
  entered.current = onEntered

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mark, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(name, { toValue: 1, duration: 420, delay: 140, useNativeDriver: true }),
    ]).start(() => entered.current?.())
  }, [mark, name])

  return (
    <View style={styles.hero}>
      <Animated.View
        style={{
          opacity: mark,
          transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        <View style={styles.markStage}>
          <Image source={BRAND_SYMBOL} style={styles.mark} resizeMode="contain" />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          alignItems: 'center',
          gap: 10,
          opacity: name,
          transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        }}
      >
        <Txt size={36} style={{ letterSpacing: 0, fontFamily: theme.font.display }}>
          Intelligence
        </Txt>
        {tagline ? (
          <Txt size={16} color={c.textMuted} style={styles.tagline}>
            {tagline}
          </Txt>
        ) : null}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  markStage: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mark: { width: 162, height: 162 },
  tagline: { textAlign: 'center', lineHeight: 23, maxWidth: 300 },
})
