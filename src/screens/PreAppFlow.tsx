import { useEffect, useRef, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import BrandLockup from '../components/ui/BrandLockup'

const LOCKUP_WIDTH = 470
const LOCKUP_HEIGHT = 160
const TARGET_SCALE = 64 / 150



export default function PreAppFlow({
  readyToReveal,
  onRevealApp,
}: {
  readyToReveal: boolean
  onRevealApp: () => void
}) {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const reduceMotion = useReducedMotion()

  const revealCalledRef = useRef(false)

  // --- BOOT ANIMATION STATE ---
  const [assembled, setAssembled] = useState(false)
  const revealStarted = useRef(false)
  
  const travel = useSharedValue(0)
  const markScale = useSharedValue(0.78)
  const markRotation = useSharedValue(-5)
  const words = useSharedValue(0)

  // --- LOGO POSITIONING ---
  const startScale = Math.min(1, (width - 20) / LOCKUP_WIDTH)
  const startLeft = (width - LOCKUP_WIDTH) / 2
  const startTop = (height - LOCKUP_HEIGHT) / 2 - 42
  const startCenterX = startLeft + LOCKUP_WIDTH / 2
  const startCenterY = startTop + LOCKUP_HEIGHT / 2
  const targetLeft = 18
  const targetTop = insets.top + 8
  const targetTranslateX = targetLeft + (LOCKUP_WIDTH * TARGET_SCALE) / 2 - startCenterX
  const targetTranslateY = targetTop + (LOCKUP_HEIGHT * TARGET_SCALE) / 2 - startCenterY

  // 1. ASSEMBLE LOGO
  useEffect(() => {
    if (reduceMotion) {
      markScale.value = 1
      markRotation.value = 0
      words.value = 1
      setAssembled(true)
      return
    }

    markScale.value = withSequence(
      withTiming(1.055, { duration: 680, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withTiming(1, { duration: 280, easing: Easing.inOut(Easing.cubic) }),
    )
    markRotation.value = withSequence(
      withTiming(2.2, { duration: 590, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withTiming(0, { duration: 390, easing: Easing.inOut(Easing.cubic) }),
    )
    words.value = withDelay(560, withTiming(1, {
      duration: 720,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }))

    const timer = setTimeout(() => setAssembled(true), 2050)
    return () => clearTimeout(timer)
  }, [markRotation, markScale, reduceMotion, words])

  // 2. TRAVEL LOGO & REVEAL
  useEffect(() => {
    if (!readyToReveal || !assembled || revealStarted.current) return
    revealStarted.current = true
    
    travel.value = withTiming(1, {
      duration: reduceMotion ? 1 : 900,
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    })

    const delay = reduceMotion ? 30 : 700
    const revealTimer = setTimeout(() => {
      if (!revealCalledRef.current) {
        revealCalledRef.current = true
        onRevealApp()
      }
    }, delay)

    return () => clearTimeout(revealTimer)
  }, [assembled, readyToReveal, reduceMotion, travel, onRevealApp])


  // --- STYLES ---
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
    <View style={styles.flex} pointerEvents="none">
      {/* 1. Global Logo (animates and stays perfectly still until unmount) */}
      <Animated.View style={[styles.lockupPosition, { left: startLeft, top: startTop }, lockupStyle]}>
        <BrandLockup variant="hero" markStyle={markStyle} wordmarkStyle={wordmarkStyle} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lockupPosition: { height: LOCKUP_HEIGHT, position: 'absolute', width: LOCKUP_WIDTH, elevation: 200, zIndex: 200 },
})
