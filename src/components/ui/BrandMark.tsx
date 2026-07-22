import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'

function BrandSymbol() {
  return (
    <Svg width={140} height={108} viewBox="0 0 140 108" accessibilityLabel="Rezolvo">
      <Defs>
        <LinearGradient id="brand" x1="12" y1="14" x2="126" y2="94" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#9B74FF" />
          <Stop offset="0.52" stopColor="#7552FF" />
          <Stop offset="1" stopColor="#4F33EA" />
        </LinearGradient>
      </Defs>
      <Path
        d="M17 43 L38 91 L61 17 L112 17"
        fill="none"
        stroke="url(#brand)"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M58 67 L76 88 L123 42"
        fill="none"
        stroke="#F4F5FA"
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M58 67 L76 88 L123 42"
        fill="none"
        stroke="url(#brand)"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * The brand lockup: the Rezolvo radical/check mark + wordmark, with an
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
    width: 140,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tagline: { textAlign: 'center', lineHeight: 23, maxWidth: 300 },
})
