import { useEffect, useRef, useState } from 'react'
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
import { useAuth } from '../auth/AuthProvider'
import { useProduct, type LearningGoal } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'

import BrandLockup from '../components/ui/BrandLockup'
import ScreenBackground from '../components/ui/ScreenBackground'
import WelcomeScreen from './WelcomeScreen'
import OnboardingScreen from './OnboardingScreen'
import RezIcon from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import {
  shouldCelebrateOnboardingCompletion,
  shouldFinishLaunchWithoutCelebration,
  shouldKeepOnboardingVisible,
} from '../lifecycle'

const LOCKUP_WIDTH = 470
const LOCKUP_HEIGHT = 160
const TARGET_SCALE = 64 / 150

const copyByGoal: Record<Exclude<LearningGoal, null>, string> = {
  en: 'Pregătirea pentru Evaluarea Națională este gata.',
  bac: 'Pregătirea pentru Bacalaureat este gata.',
  general: 'Spațiul tău de matematică este gata.',
}

export default function PreAppFlow({
  readyToReveal,
  onFinished,
  onSolve,
}: {
  readyToReveal: boolean
  onFinished: () => void
  onSolve: () => void | Promise<void>
}) {
  const { user } = useAuth()
  const { hydrated, onboardingCompleted, goal } = useProduct()
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const reduceMotion = useReducedMotion()

  const [bootRevealed, setBootRevealed] = useState(false)
  const [isCelebration, setIsCelebration] = useState(false)
  const finishedRef = useRef(false)
  const completedHereRef = useRef(false)
  const openingSolverRef = useRef(false)

  const finishOnce = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinished()
  }

  const markOnboardingCompletionStarted = () => {
    completedHereRef.current = true
  }

  const cancelOnboardingCompletion = () => {
    completedHereRef.current = false
  }

  const celebrateOnboardingCompletion = () => {
    setIsCelebration(true)
  }

  const solveFromOnboarding = async () => {
    openingSolverRef.current = true
    try {
      await onSolve()
      finishOnce()
    } catch (error) {
      openingSolverRef.current = false
      throw error
    }
  }

  // --- BOOT ANIMATION STATE ---
  const [assembled, setAssembled] = useState(false)
  const revealStarted = useRef(false)
  
  const bgOpacity = useSharedValue(1)
  const travel = useSharedValue(0)
  const markScale = useSharedValue(0.78)
  const markRotation = useSharedValue(-5)
  const words = useSharedValue(0)

  // --- CELEBRATION ANIMATION STATE ---
  const pop = useSharedValue(0)

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

    bgOpacity.value = withDelay(
      reduceMotion ? 30 : 880,
      withTiming(0, { duration: reduceMotion ? 100 : 300, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(setBootRevealed)(true)
      }),
    )
  }, [assembled, bgOpacity, readyToReveal, reduceMotion, travel])

  // A profile that was already complete on launch should reveal directly into
  // the app. It is not an onboarding success and must never show a reward.
  useEffect(() => {
    if (!shouldFinishLaunchWithoutCelebration({
      bootRevealed,
      hasUser: !!user,
      profileHydrated: hydrated,
      onboardingCompleted,
      completedInThisFlow: completedHereRef.current,
      openingSolver: openingSolverRef.current,
    })) return
    finishOnce()
  }, [bootRevealed, hydrated, onboardingCompleted, user])

  // 3. CELEBRATION (only after this flow explicitly completes onboarding)
  useEffect(() => {
    if (!isCelebration || !shouldCelebrateOnboardingCompletion({
      bootRevealed,
      completedInThisFlow: completedHereRef.current,
      goal,
    })) return
    
    if (reduceMotion) {
      pop.value = 1
      const timer = setTimeout(() => {
        finishOnce()
      }, 500)
      return () => clearTimeout(timer)
    }

    pop.value = withSequence(
      withSpring(1.14, { damping: 9, stiffness: 220, mass: 0.55 }),
      withSpring(1, { damping: 12, stiffness: 190 }),
    )

    const timer = setTimeout(() => {
      finishOnce()
    }, 1500)
    return () => clearTimeout(timer)
  }, [bootRevealed, isCelebration, goal, pop, reduceMotion])

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

  const popStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ scale: pop.value }, { rotate: `${interpolate(pop.value, [0, 1.14], [-8, 2])}deg` }],
  }))
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.value, [0, 0.55, 1], [0, 0, 1]),
    transform: [{ translateY: interpolate(pop.value, [0, 1], [18, 0]) }],
  }))

  // CONDITIONAL CONTENT
  let content = null
  if (!user) {
    content = <WelcomeScreen />
  } else if (shouldKeepOnboardingVisible({
    hasUser: !!user,
    onboardingCompleted,
    completedInThisFlow: completedHereRef.current,
    openingSolver: openingSolverRef.current,
  })) {
    content = (
      <OnboardingScreen
        onSolve={solveFromOnboarding}
        onCompletionStarted={markOnboardingCompletionStarted}
        onCompletionFailed={cancelOnboardingCompletion}
        onCompleted={celebrateOnboardingCompletion}
      />
    )
  }

  return (
    <View style={styles.flex}>
      {/* 1. Underlying Content (Welcome or Onboarding) */}
      <View style={styles.flex}>
        {content}
      </View>

      {/* 2. Celebration Overlay */}
      {isCelebration && goal ? (
        <Animated.View style={styles.celebrationOverlay}>
          <ScreenBackground>
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
      ) : null}

      {/* 3. Global Logo (stays mounted perfectly still) */}
      <Animated.View style={[styles.lockupPosition, { left: startLeft, top: startTop }, lockupStyle]}>
        <BrandLockup variant="hero" markStyle={markStyle} wordmarkStyle={wordmarkStyle} />
      </Animated.View>

      {/* 4. Boot Background (fades out at the end of the splash sequence) */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: bgOpacity.value, elevation: 100, zIndex: 100 }]}>
        <ScreenBackground />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lockupPosition: { height: LOCKUP_HEIGHT, position: 'absolute', width: LOCKUP_WIDTH, elevation: 200, zIndex: 200 },
  celebrationOverlay: { ...StyleSheet.absoluteFillObject, elevation: 50, zIndex: 50 },
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
