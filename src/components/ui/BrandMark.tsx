import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { useTheme } from '../../theme/ThemeProvider'
import ProfessorMark from './ProfessorMark'
import Txt from './Txt'

function BrandSymbol() {
  return <ProfessorMark style={styles.professor} />
}

/**
 * The brand lockup: the Profu' de Mate professor + wordmark, with an
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
  const c = theme.colors
  const mark = useRef(new Animated.Value(0)).current
  const name = useRef(new Animated.Value(0)).current

  const entered = useRef(onEntered)
  entered.current = onEntered

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mark, { toValue: 1, duration: reduceMotion ? 1 : 620, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
      Animated.timing(name, { toValue: 1, duration: reduceMotion ? 1 : 560, delay: reduceMotion ? 0 : 150, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
    ]).start(() => entered.current?.())
  }, [mark, name, reduceMotion])

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
        <View style={styles.nameRow}>
          <Txt size={38} style={{ letterSpacing: -1.4, fontFamily: theme.font.display }}>
            Profu’
          </Txt>
          <Txt size={27} color={c.accent} style={{ letterSpacing: -0.8, fontFamily: theme.font.serifItalic }}>
            de Mate
          </Txt>
        </View>
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
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  markStage: {
    width: 300,
    height: 265,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  professor: { height: 292, width: 292 },
  nameRow: { alignItems: 'baseline', flexDirection: 'row', gap: 7 },
  tagline: { textAlign: 'center', lineHeight: 23, maxWidth: 300 },
})
