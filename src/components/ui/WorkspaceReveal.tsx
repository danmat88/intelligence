import { useEffect, useRef } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import type { LearningGoal } from '../../product/ProductProvider'
import { useTheme } from '../../theme/ThemeProvider'
import BrandLockup from './BrandLockup'
import RezIcon from './RezIcon'
import ScreenBackground from './ScreenBackground'
import Txt from './Txt'

const copyByGoal: Record<Exclude<LearningGoal, null>, string> = {
  en: 'Pregătirea pentru Evaluarea Națională este gata.',
  bac: 'Pregătirea pentru Bacalaureat este gata.',
  general: 'Spațiul tău de matematică este gata.',
}

/** Short celebration shown only when onboarding becomes a configured app. */
export default function WorkspaceReveal({
  goal,
  onFinished,
}: {
  goal: Exclude<LearningGoal, null>
  onFinished: () => void
}) {
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { theme } = useTheme()
  const c = theme.colors
  const reduceMotion = useReducedMotion()
  const finished = useRef(onFinished)
  finished.current = onFinished
  const pop = useSharedValue(0)
  const lift = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) {
      pop.value = 1
      lift.value = withDelay(120, withTiming(1, { duration: 160 }, (done) => {
        if (done) runOnJS(finished.current)()
      }))
      return
    }
    pop.value = withSequence(
      withSpring(1.14, { damping: 9, stiffness: 220, mass: 0.55 }),
      withSpring(1, { damping: 12, stiffness: 190 }),
    )
    lift.value = withDelay(720, withTiming(1, { duration: 460, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(finished.current)()
    }))
  }, [lift, pop, reduceMotion])

  const curtainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1], [0, -height]) }],
  }))
  const popStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ scale: pop.value }, { rotate: `${interpolate(pop.value, [0, 1.14], [-8, 2])}deg` }],
  }))
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.55, 1], [0, 0, 1]),
    transform: [{ translateY: interpolate(pop.value, [0, 1], [18, 0]) }],
  }))

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, curtainStyle]}>
      <ScreenBackground>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <BrandLockup />
        </View>
        <View style={styles.center}>
          <Animated.View style={[styles.celebration, popStyle]}>
            <View style={[styles.mathChip, styles.chipPi, { backgroundColor: c.bubblyBlue, borderColor: c.bubblyBlueDark }]}>
              <Txt weight="extrabold" size={15} color="#FFFFFF">π</Txt>
            </View>
            <View style={[styles.check, { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }]}>
              <RezIcon name="check" size={42} color="#FFFFFF" accent="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View style={[styles.mathChip, styles.chipX, { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark }]}>
              <Txt weight="extrabold" size={12} color="#FFFFFF">x²</Txt>
            </View>
          </Animated.View>
          <Animated.View style={[styles.copy, copyStyle]}>
            <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>Totul e pregătit!</Txt>
            <Txt size={14.5} color={c.textMuted} style={styles.subtitle}>{copyByGoal[goal]}</Txt>
          </Animated.View>
        </View>
      </ScreenBackground>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, elevation: 90, zIndex: 90 },
  header: { paddingHorizontal: 18 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 80, paddingHorizontal: 28 },
  celebration: { height: 132, position: 'relative', width: 170 },
  check: { alignItems: 'center', alignSelf: 'center', borderBottomWidth: 10, borderRadius: 40, borderWidth: 4, height: 100, justifyContent: 'center', width: 100 },
  mathChip: { alignItems: 'center', borderRadius: 99, borderWidth: 2.5, borderBottomWidth: 5, height: 38, justifyContent: 'center', position: 'absolute', width: 38 },
  chipPi: { left: 0, top: 4, transform: [{ rotate: '-9deg' }] },
  chipX: { bottom: 0, right: 0, transform: [{ rotate: '8deg' }] },
  copy: { alignItems: 'center', marginTop: 14 },
  title: { fontSize: 32, letterSpacing: -1, lineHeight: 38, textAlign: 'center' },
  subtitle: { lineHeight: 20, marginTop: 7, maxWidth: 320, textAlign: 'center' },
})
