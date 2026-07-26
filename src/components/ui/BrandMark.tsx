import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import BrandGlyph from './BrandGlyph'
import Txt from './Txt'

function BrandSymbol() {
  return <BrandGlyph size={118} />
}

/**
 * The brand lockup: the Rezolvo ribbon/equality mark + wordmark, with an
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
      Animated.timing(mark, { toValue: 1, duration: 560, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
      Animated.timing(name, { toValue: 1, duration: 560, delay: 160, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
    ]).start(() => entered.current?.())
  }, [mark, name])

  return (
    <View style={styles.hero}>
      {/* Pure slides — the lockup settles into place fully opaque (no fade/zoom). */}
      <Animated.View
        style={{
          transform: [{ translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <View style={styles.markStage}>
          <BrandSymbol />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          alignItems: 'center',
          gap: 10,
          transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
        }}
      >
        <Txt size={38} style={{ letterSpacing: -1, fontFamily: theme.font.display }}>
          Rezolvo
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
    width: 126,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tagline: { textAlign: 'center', lineHeight: 23, maxWidth: 300 },
})
