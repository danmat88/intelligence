import { useEffect, useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
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
  withTiming,
} from 'react-native-reanimated'
import BrandLockup from './BrandLockup'
import ScreenBackground from './ScreenBackground'

const LOCKUP_WIDTH = 470
const LOCKUP_HEIGHT = 160
const TARGET_SCALE = 64 / 150

/**
 * Continuous brand hand-off: assemble in the middle, travel to the canonical
 * header position, then reveal the already-mounted destination underneath.
 */
export default function LaunchTransition({
  readyToReveal,
  moveToHeader,
  onFinished,
}: {
  readyToReveal: boolean
  moveToHeader: boolean
  onFinished: () => void
}) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const finished = useRef(onFinished)
  finished.current = onFinished
  const revealStarted = useRef(false)
  const [assembled, setAssembled] = useState(false)

  const overlay = useSharedValue(1)
  const travel = useSharedValue(0)
  const markScale = useSharedValue(0.78)
  const markRotation = useSharedValue(-5)
  const words = useSharedValue(0)

  const startScale = Math.min(1, (width - 20) / LOCKUP_WIDTH)
  const startLeft = (width - LOCKUP_WIDTH) / 2
  const startTop = (height - LOCKUP_HEIGHT) / 2 - 42
  const startCenterX = startLeft + LOCKUP_WIDTH / 2
  const startCenterY = startTop + LOCKUP_HEIGHT / 2
  const targetLeft = 18
  const targetTop = insets.top + 8
  const targetTranslateX = targetLeft + (LOCKUP_WIDTH * TARGET_SCALE) / 2 - startCenterX
  const targetTranslateY = targetTop + (LOCKUP_HEIGHT * TARGET_SCALE) / 2 - startCenterY

  useEffect(() => {
    if (reduceMotion) {
      markScale.value = 1
      markRotation.value = 0
      words.value = 1
      setAssembled(true)
      return
    }

    markScale.value = withSequence(
      withTiming(1.055, {
        duration: 680,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
      withTiming(1, {
        duration: 280,
        easing: Easing.inOut(Easing.cubic),
      }),
    )
    markRotation.value = withSequence(
      withTiming(2.2, {
        duration: 590,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
      withTiming(0, {
        duration: 390,
        easing: Easing.inOut(Easing.cubic),
      }),
    )
    words.value = withDelay(560, withTiming(1, {
      duration: 720,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }))

    // Let the complete lockup breathe before it starts travelling. This also
    // keeps the individual motions from competing with the hand-off.
    const timer = setTimeout(() => setAssembled(true), 2050)
    return () => clearTimeout(timer)
  }, [markRotation, markScale, reduceMotion, words])

  useEffect(() => {
    if (!readyToReveal || !assembled || revealStarted.current) return
    revealStarted.current = true
    if (moveToHeader) {
      travel.value = withTiming(1, {
        duration: reduceMotion ? 1 : 900,
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      })
    }
    overlay.value = withDelay(
      reduceMotion ? 30 : moveToHeader ? 880 : 180,
      withTiming(0, { duration: reduceMotion ? 100 : 300, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(finished.current)()
      }),
    )
  }, [assembled, moveToHeader, overlay, readyToReveal, reduceMotion, travel])

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }))
  const lockupStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(travel.value, [0, 1], [0, targetTranslateX]) },
      { translateY: interpolate(travel.value, [0, 1], [0, targetTranslateY]) },
      { scale: interpolate(travel.value, [0, 1], [startScale, TARGET_SCALE]) },
    ],
  }))
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${markRotation.value}deg` }, { scale: markScale.value }],
  }))
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [
      { translateX: interpolate(words.value, [0, 1], [-28, 0]) },
      { translateY: interpolate(words.value, [0, 1], [10, 0]) },
      { scale: interpolate(words.value, [0, 1], [0.94, 1]) },
    ],
  }))

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <ScreenBackground>
        <Animated.View style={[styles.lockupPosition, { left: startLeft, top: startTop }, lockupStyle]}>
          <BrandLockup variant="hero" markStyle={markStyle} wordmarkStyle={wordmarkStyle} />
        </Animated.View>
      </ScreenBackground>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, elevation: 100, zIndex: 100 },
  lockupPosition: { height: LOCKUP_HEIGHT, position: 'absolute', width: LOCKUP_WIDTH },
})
