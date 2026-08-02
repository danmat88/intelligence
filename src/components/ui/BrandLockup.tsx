import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { useTheme } from '../../theme/ThemeProvider'
import ProfessorMark from './ProfessorMark'
import Txt from './Txt'

type Variant = 'compact' | 'hero'

/** One canonical Profu’ de Mate lockup, shared by launch, onboarding and app. */
export default function BrandLockup({
  variant = 'compact',
  style,
  markStyle,
  wordmarkStyle,
}: {
  variant?: Variant
  style?: StyleProp<ViewStyle>
  markStyle?: StyleProp<ViewStyle>
  wordmarkStyle?: StyleProp<ViewStyle>
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const hero = variant === 'hero'

  return (
    <Animated.View style={[styles.lockup, hero ? styles.lockupHero : styles.lockupCompact, style]}>
      <Animated.View
        style={[
          styles.mark,
          hero ? styles.markHero : styles.markCompact,
          markStyle,
        ]}
      >
        <ProfessorMark style={hero ? styles.professorHero : styles.professorCompact} />
      </Animated.View>

      <Animated.View style={[styles.wordmark, wordmarkStyle]}>
        <Txt
          style={[
            hero ? styles.profuHero : styles.profuCompact,
            { color: c.text, fontFamily: theme.font.display },
          ]}
        >
          Profu’
        </Txt>
        <Animated.View style={[styles.mateWrap, hero ? styles.mateWrapHero : styles.mateWrapCompact]}>
          <Txt
            style={[
              hero ? styles.mateHero : styles.mateCompact,
              { color: c.bubblyRed, fontFamily: theme.font.handwritten },
            ]}
          >
            de Mate
          </Txt>
          <Animated.View
            style={[
              styles.underline,
              hero ? styles.underlineHero : styles.underlineCompact,
              { backgroundColor: c.bubblyYellow },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center', flexDirection: 'row' },
  lockupCompact: { gap: 10 },
  lockupHero: { gap: 14 },
  mark: { alignItems: 'center', justifyContent: 'center' },
  markCompact: { height: 64, width: 64 },
  markHero: { height: 150, width: 150 },
  professorCompact: { height: 68, width: 68 },
  professorHero: { height: 158, width: 158 },
  wordmark: { alignItems: 'baseline', flexDirection: 'row', flexShrink: 1, gap: 5 },
  profuCompact: { fontSize: 23, letterSpacing: -0.75, lineHeight: 28 },
  profuHero: { fontSize: 54, letterSpacing: -2, lineHeight: 61 },
  mateWrap: { position: 'relative', transform: [{ rotate: '-2.5deg' }] },
  mateWrapCompact: { paddingBottom: 3 },
  mateWrapHero: { paddingBottom: 5 },
  mateCompact: { fontSize: 19, letterSpacing: -0.4, lineHeight: 25 },
  mateHero: { fontSize: 45, letterSpacing: -1, lineHeight: 51 },
  underline: { alignSelf: 'center', borderRadius: 99, position: 'absolute', transform: [{ rotate: '-1deg' }] },
  underlineCompact: { bottom: 1, height: 3, width: '84%' },
  underlineHero: { bottom: 0, height: 5, width: '86%' },
})
