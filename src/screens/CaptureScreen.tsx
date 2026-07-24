import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  Keyboard,
  Linking,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native'
import RAnimated, {
  Easing as REasing,
  SlideInDown,
  SlideOutDown,
  withTiming,
  type EntryAnimationsValues,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import CrossFade from '../components/ui/CrossFade'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import { cropAndPrepare, pickFromLibrary, type CapturedImage, type RawShot } from '../solve/capture'

/**
 * The capture flow — Rezolvo's one dark surface, a "visor". Camera and trim
 * both live INSIDE the app: no system camera, no foreign UI. Slides up over
 * Home (which stays put underneath), freezes the shot into the trim stage,
 * and hands back exactly one problem.
 */

// Fixed visor palette — deliberately not the paper theme.
const V = {
  bg: '#0E0B18',
  stage: '#1A152B',
  line: 'rgba(255,255,255,0.16)',
  fill: 'rgba(255,255,255,0.06)',
  text: '#F4F2FA',
  soft: '#D3CDE4',
  faint: '#9C95B4',
  accent: '#A08CFF',
  onAccent: '#0E0B18',
  scrim: 'rgba(10,7,18,0.6)',
}

type Box = { x: number; y: number; w: number; h: number }
type Rect = { x: number; y: number; w: number; h: number; s: number }

const MIN_BOX = 64 // dp — smallest the trim box can be pinched to

/** House curve — decisive start, long soft landing. */
const VISOR_EASE = REasing.bezier(0.22, 1, 0.36, 1)

/** Guides rise onto the live feed the moment the camera wakes (UI thread). */
function riseEnter(v: EntryAnimationsValues) {
  'worklet'
  return {
    initialValues: { originY: v.targetOriginY + 26 },
    animations: { originY: withTiming(v.targetOriginY, { duration: 480, easing: VISOR_EASE }) },
  }
}

export default function CaptureScreen({
  open,
  onClose,
  onUsePhoto,
  onTypeInstead,
}: {
  /** null = closed; 'camera' opens the viewfinder, 'library' jumps to the picker. */
  open: 'camera' | 'library' | null
  onClose: () => void
  onUsePhoto: (img: CapturedImage) => void
  onTypeInstead: () => void
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  // The camera hardware NEVER rides an animation: the dark visor slides up
  // empty first (pure motion), the CameraView mounts only after it LANDS —
  // like a lens opening. On close it powers down first, then the empty visor
  // slides away. This is what killed the enter/exit freeze.
  const [camLive, setCamLive] = useState(false)
  // The photo remembers where it came from — "back" and the retake button
  // must return the user THERE, never to a surface they never visited.
  const [shot, setShot] = useState<(RawShot & { source: 'camera' | 'library' }) | null>(null)
  // Which surface the visor shows. Kept stable through the exit animation so
  // a closing frame can never flash the other stage (the "camera flash after
  // cancelling the gallery" bug).
  const [stage, setStage] = useState<'camera' | 'trim'>('camera')
  // How the visor was ENTERED: from the camera there is a camera to go back
  // to; from the gallery there is only Home behind the trim stage.
  const entryRef = useRef<'camera' | 'library'>('camera')
  const pickingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (open === 'camera') {
      Keyboard.dismiss() // the visor is fullscreen — never let the keyboard sit over it
      entryRef.current = 'camera'
      setShot(null)
      setStage('camera')
      setMounted(true)
      // Lens-opening flow: the visor lands (460ms), THEN the camera wakes.
      const id = setTimeout(() => setCamLive(true), 540)
      return () => clearTimeout(id)
    } else if (open === 'library') {
      // No visor yet: the system picker opens over Home. The visor only
      // appears if a photo actually comes back — sliding straight into the
      // trim stage. Cancel = nothing ever covered the screen.
      Keyboard.dismiss()
      entryRef.current = 'library'
      if (!pickingRef.current) {
        pickingRef.current = true
        pickFromLibrary()
          .then((s) => {
            if (s) {
              setShot({ ...s, source: 'library' })
              setStage('trim')
              setMounted(true)
            } else {
              onCloseRef.current()
            }
          })
          .catch(() => onCloseRef.current())
          .finally(() => {
            pickingRef.current = false
          })
      }
    } else {
      // Power the camera down FIRST, give teardown a beat, then let the
      // empty visor slide away (the exiting animation freezes the subtree,
      // so nothing can flash or re-render mid-flight).
      setCamLive(false)
      const id = setTimeout(() => {
        setMounted(false)
        setShot(null)
        setStage('camera')
      }, 80)
      return () => clearTimeout(id)
    }
  }, [open])

  const showTrim = useCallback((s: RawShot, source: 'camera' | 'library') => {
    setShot({ ...s, source })
    setStage('trim')
  }, [])

  const retake = useCallback(() => {
    setStage('camera')
    setShot(null)
  }, [])

  // "Choose another": re-open the picker over the trim stage; cancelling it
  // keeps the current photo — nothing is lost, nothing flashes.
  const repick = useCallback(async () => {
    if (pickingRef.current) return
    pickingRef.current = true
    try {
      const s = await pickFromLibrary()
      if (s) setShot({ ...s, source: 'library' })
    } catch {
      // picker unavailable — keep the current photo
    } finally {
      pickingRef.current = false
    }
  }, [])

  // Back from the trim stage goes where the user actually came from:
  // camera entry → the camera; gallery entry → Home (there is no camera behind).
  const backFromTrim = useCallback(() => {
    if (entryRef.current === 'camera') retake()
    else onCloseRef.current()
  }, [retake])

  // Hardware back mirrors the visible back button. Never exits the app.
  useEffect(() => {
    if (!open || !mounted) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stage === 'trim') backFromTrim()
      else onCloseRef.current()
      return true
    })
    return () => sub.remove()
  }, [open, mounted, stage, backFromTrim])

  if (!mounted) return null

  return (
    <RAnimated.View
      entering={SlideInDown.duration(460).easing(VISOR_EASE)}
      exiting={SlideOutDown.duration(380).easing(REasing.in(REasing.cubic))}
      style={[StyleSheet.absoluteFill, styles.host]}
    >
      <StatusBar style="light" />
      <CrossFade dep={stage} style={styles.flex} axis="x">
        {stage === 'trim' && shot ? (
          <TrimStage
            shot={shot}
            backIcon={entryRef.current === 'camera' ? 'arrow-left' : 'x'}
            onBack={backFromTrim}
            ghostLabel={shot.source === 'camera' ? t('crop.retake') : t('crop.chooseAnother')}
            ghostIcon={shot.source === 'camera' ? 'rotate-ccw' : 'image'}
            onGhost={shot.source === 'camera' ? retake : repick}
            onUsePhoto={onUsePhoto}
          />
        ) : (
          <CameraStage
            live={camLive}
            onShot={(s) => showTrim(s, 'camera')}
            onPick={(s) => showTrim(s, 'library')}
            onClose={onClose}
            onTypeInstead={onTypeInstead}
          />
        )}
      </CrossFade>
    </RAnimated.View>
  )
}

/* ------------------------------ camera stage ------------------------------ */

function CameraStage({
  live,
  onShot,
  onPick,
  onClose,
  onTypeInstead,
}: {
  /** False while the visor is still travelling — the camera mounts on true. */
  live: boolean
  onShot: (s: RawShot) => void
  onPick: (s: RawShot) => void
  onClose: () => void
  onTypeInstead: () => void
}) {
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { theme } = useTheme()
  const cam = useRef<CameraView>(null)
  const [perm, requestPerm] = useCameraPermissions()
  const [ready, setReady] = useState(false)
  const [torch, setTorch] = useState(false)
  const [busy, setBusy] = useState(false)
  const shutter = useRef(new Animated.Value(0)).current
  // The capture blink — a real camera answers with light.
  const flash = useRef(new Animated.Value(0)).current

  // Ask once, after the visor has landed (the system dialog is heavy — it
  // must never pop mid-slide). If it's refused, the panel below offers a
  // manual retry (or Settings on "never").
  const askedRef = useRef(false)
  useEffect(() => {
    if (live && perm && !perm.granted && perm.canAskAgain && !askedRef.current) {
      askedRef.current = true
      requestPerm()
    }
  }, [live, perm, requestPerm])

  const snap = useCallback(async () => {
    if (!ready || busy || !cam.current) return
    setBusy(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    Animated.sequence([
      Animated.timing(shutter, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(shutter, { toValue: 0, useNativeDriver: true, damping: 12, stiffness: 320 }),
    ]).start()
    Animated.sequence([
      Animated.timing(flash, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start()
    try {
      const p = await cam.current.takePictureAsync({ quality: 0.9 })
      if (p?.uri) {
        cam.current?.pausePreview() // freeze the frame — no live-feed flicker under the fade
        onShot({ uri: p.uri, width: p.width, height: p.height })
      }
    } catch {
      // stay in the camera — the user just presses again
    } finally {
      setBusy(false)
    }
  }, [ready, busy, shutter, onShot])

  const pick = useCallback(async () => {
    try {
      const s = await pickFromLibrary()
      if (s) onPick(s)
    } catch {
      // cancelled / unavailable — stay in the camera
    }
  }, [onPick])

  return (
    <View style={styles.flex}>
      {/* top chrome */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Press onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.close')} style={styles.chromeBtn}>
          <RezIcon name="close" size={19} color={V.text} accent={V.accent} />
        </Press>
        <Txt size={15} color={V.text} style={[styles.chromeTitle, { fontFamily: theme.font.display }]}>
          {t('capture.title')}
        </Txt>
        <Press
          onPress={() => setTorch((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.torch')}
          style={[styles.chromeBtn, torch && { backgroundColor: 'rgba(160,140,255,0.22)', borderColor: V.accent }]}
        >
          <RezIcon name="premium" size={18} color={torch ? V.accent : V.text} accent={torch ? V.accent : V.text} />
        </Press>
      </View>

      {/* viewfinder — contained with rounded corners, so it reads as Rezolvo's
          own surface rather than a fullscreen system camera */}
      <View style={styles.viewport}>
        {live && perm?.granted ? (
          <CameraView
            ref={cam}
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            enableTorch={torch}
            onCameraReady={() => setReady(true)}
          />
        ) : live && perm ? (
          <View style={[styles.flex, styles.center, styles.deniedPad]}>
            <RezIcon name="camera-off" size={31} color={V.faint} accent={V.accent} />
            <Txt size={14} color={V.soft} style={styles.deniedTxt}>
              {t('capture.denied')}
            </Txt>
            <Press
              onPress={() => (perm.canAskAgain ? requestPerm() : Linking.openSettings())}
              style={styles.settingsBtn}
            >
              <Txt size={13.5} weight="semibold" color={V.onAccent}>
                {perm.canAskAgain ? t('capture.allow') : t('capture.openSettings')}
              </Txt>
            </Press>
          </View>
        ) : (
          // Dark stage while the visor travels / the camera warms up.
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={V.accent} />
            <Txt size={12} color={V.faint} style={styles.warming}>
              {t('capture.warming')}
            </Txt>
          </View>
        )}

        {/* capture blink */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />

        {ready && (
          // The guides rise onto the live feed the moment the camera wakes.
          <RAnimated.View pointerEvents="none" entering={riseEnter} style={StyleSheet.absoluteFill}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
            </View>
            <View style={styles.hintWrap}>
              <View style={styles.hintPill}>
                <Txt size={12.5} weight="semibold" color={V.soft}>
                  {t('capture.hint')}
                </Txt>
              </View>
            </View>
          </RAnimated.View>
        )}
      </View>

      {/* bottom controls: gallery · shutter · type-instead */}
      <View style={[styles.camBar, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.side}>
          <Press onPress={pick} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('hero.library')} style={styles.sideBtn}>
            <RezIcon name="gallery" size={21} color={V.text} accent={V.accent} />
          </Press>
          <Txt size={10.5} weight="semibold" color={V.faint} style={styles.sideLbl}>
            {t('capture.lblGallery')}
          </Txt>
        </View>
        <Press
          onPress={snap}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.shutter')}
          scaleTo={0.9}
          style={[styles.shutterRing, !ready && { opacity: 0.45 }]}
        >
          <Animated.View
            style={[
              styles.shutterDisc,
              { transform: [{ scale: shutter.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }] },
            ]}
          >
            {busy && <ActivityIndicator color={V.onAccent} />}
          </Animated.View>
        </Press>
        <View style={styles.side}>
          <Press onPress={onTypeInstead} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('capture.typeInstead')} style={styles.sideBtn}>
            <RezIcon name="write" size={21} color={V.text} accent={V.accent} />
          </Press>
          <Txt size={10.5} weight="semibold" color={V.faint} style={styles.sideLbl}>
            {t('capture.lblType')}
          </Txt>
        </View>
      </View>
    </View>
  )
}

/* ------------------------------- trim stage ------------------------------- */

function TrimStage({
  shot,
  backIcon,
  onBack,
  ghostLabel,
  ghostIcon,
  onGhost,
  onUsePhoto,
}: {
  shot: RawShot
  /** 'arrow-left' when a camera sits behind this stage, 'x' when Home does. */
  backIcon: 'arrow-left' | 'x'
  onBack: () => void
  /** "Refă" (retake) for camera shots, "Alege alta" (re-pick) for gallery picks. */
  ghostLabel: string
  ghostIcon: 'rotate-ccw' | 'image'
  onGhost: () => void
  onUsePhoto: (img: CapturedImage) => void
}) {
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { theme } = useTheme()
  const [area, setArea] = useState<{ w: number; h: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<Box | null>(null)
  boxRef.current = box
  const startRef = useRef<Box | null>(null)

  // Where the contain-fit image actually sits inside the stage.
  const imgRect: Rect | null = useMemo(() => {
    if (!area || !shot.width || !shot.height) return null
    const s = Math.min(area.w / shot.width, area.h / shot.height)
    const w = shot.width * s
    const h = shot.height * s
    return { x: (area.w - w) / 2, y: (area.h - h) / 2, w, h, s }
  }, [area, shot])

  // Start with a wide strip — the shape of a single exercise on a page.
  useEffect(() => {
    if (!imgRect || boxRef.current) return
    const w = imgRect.w * 0.86
    const h = Math.max(MIN_BOX, imgRect.h * 0.3)
    setBox({ x: imgRect.x + (imgRect.w - w) / 2, y: imgRect.y + (imgRect.h - h) / 2, w, h })
  }, [imgRect])

  const responders = useMemo(() => {
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
    type Kind = 'tl' | 'tr' | 'bl' | 'br' | 'l' | 'r' | 't' | 'b' | 'move'
    const make = (kind: Kind) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRef.current = boxRef.current
          Haptics.selectionAsync().catch(() => {}) // you FEEL the grab
        },
        onPanResponderMove: (_, g) => {
          const s = startRef.current
          if (!s || !imgRect) return
          const R = imgRect
          if (kind === 'move') {
            setBox({
              x: clamp(s.x + g.dx, R.x, R.x + R.w - s.w),
              y: clamp(s.y + g.dy, R.y, R.y + R.h - s.h),
              w: s.w,
              h: s.h,
            })
            return
          }
          const right = s.x + s.w
          const bottom = s.y + s.h
          let { x, y, w, h } = s
          // Corners move two sides; edge handles move exactly one — math
          // problems are wide strips, so one-handed height tweaks matter.
          if (kind === 'tl' || kind === 'bl' || kind === 'l') {
            x = clamp(s.x + g.dx, R.x, right - MIN_BOX)
            w = right - x
          } else if (kind === 'tr' || kind === 'br' || kind === 'r') {
            w = clamp(s.w + g.dx, MIN_BOX, R.x + R.w - s.x)
          }
          if (kind === 'tl' || kind === 'tr' || kind === 't') {
            y = clamp(s.y + g.dy, R.y, bottom - MIN_BOX)
            h = bottom - y
          } else if (kind === 'bl' || kind === 'br' || kind === 'b') {
            h = clamp(s.h + g.dy, MIN_BOX, R.y + R.h - s.y)
          }
          setBox({ x, y, w, h })
        },
      })
    return {
      tl: make('tl'),
      tr: make('tr'),
      bl: make('bl'),
      br: make('br'),
      l: make('l'),
      r: make('r'),
      t: make('t'),
      b: make('b'),
      move: make('move'),
    }
  }, [imgRect])

  const confirm = useCallback(async () => {
    if (!box || !imgRect || busy) return
    setBusy(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    try {
      const img = await cropAndPrepare(shot, {
        x: (box.x - imgRect.x) / imgRect.s,
        y: (box.y - imgRect.y) / imgRect.s,
        width: box.w / imgRect.s,
        height: box.h / imgRect.s,
      })
      onUsePhoto(img)
    } catch {
      setBusy(false) // stay here; the user can retry or retake
    }
  }, [box, imgRect, busy, shot, onUsePhoto])

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Press
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={backIcon === 'x' ? t('a11y.close') : t('crop.retake')}
          style={styles.chromeBtn}
        >
          <RezIcon name={backIcon === 'x' ? 'close' : 'back'} size={19} color={V.text} accent={V.accent} />
        </Press>
        <Txt size={15} color={V.text} style={[styles.chromeTitle, { fontFamily: theme.font.display }]}>
          {t('crop.title')}
        </Txt>
        <View style={styles.chromeGhost} />
      </View>

      <View style={styles.viewport} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        {box && imgRect && (
          <>
            {/* dim everything outside the box */}
            <View pointerEvents="none" style={[styles.dim, { left: 0, right: 0, top: 0, height: box.y }]} />
            <View pointerEvents="none" style={[styles.dim, { left: 0, right: 0, top: box.y + box.h, bottom: 0 }]} />
            <View pointerEvents="none" style={[styles.dim, { left: 0, width: box.x, top: box.y, height: box.h }]} />
            <View pointerEvents="none" style={[styles.dim, { left: box.x + box.w, right: 0, top: box.y, height: box.h }]} />

            {/* the box itself — draggable body, L-bracket corners, edge bars */}
            <View
              {...responders.move.panHandlers}
              style={[styles.trimBox, { left: box.x, top: box.y, width: box.w, height: box.h }]}
            />
            <View {...responders.tl.panHandlers} style={[styles.handleHit, { left: box.x - 22, top: box.y - 22 }]}>
              <View style={[styles.bracket, styles.bTL]} />
            </View>
            <View {...responders.tr.panHandlers} style={[styles.handleHit, { left: box.x + box.w - 22, top: box.y - 22 }]}>
              <View style={[styles.bracket, styles.bTR]} />
            </View>
            <View {...responders.bl.panHandlers} style={[styles.handleHit, { left: box.x - 22, top: box.y + box.h - 22 }]}>
              <View style={[styles.bracket, styles.bBL]} />
            </View>
            <View {...responders.br.panHandlers} style={[styles.handleHit, { left: box.x + box.w - 22, top: box.y + box.h - 22 }]}>
              <View style={[styles.bracket, styles.bBR]} />
            </View>
            <View {...responders.t.panHandlers} style={[styles.edgeHitH, { left: box.x + box.w / 2 - 30, top: box.y - 18 }]}>
              <View style={styles.edgeBarH} />
            </View>
            <View {...responders.b.panHandlers} style={[styles.edgeHitH, { left: box.x + box.w / 2 - 30, top: box.y + box.h - 18 }]}>
              <View style={styles.edgeBarH} />
            </View>
            <View {...responders.l.panHandlers} style={[styles.edgeHitV, { left: box.x - 18, top: box.y + box.h / 2 - 30 }]}>
              <View style={styles.edgeBarV} />
            </View>
            <View {...responders.r.panHandlers} style={[styles.edgeHitV, { left: box.x + box.w - 18, top: box.y + box.h / 2 - 30 }]}>
              <View style={styles.edgeBarV} />
            </View>

            {/* one quiet instruction, out of the way at the top */}
            <View pointerEvents="none" style={styles.hintTopWrap}>
              <View style={styles.hintPill}>
                <Txt size={12} weight="semibold" color={V.soft}>
                  {t('crop.hint')}
                </Txt>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={[styles.trimBar, { paddingBottom: insets.bottom + 14 }]}>
        <Press
          onPress={onGhost}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={ghostLabel}
          style={styles.ghostTile}
        >
          <RezIcon name={ghostIcon === 'image' ? 'gallery' : 'retry'} size={19} color={V.soft} accent={V.accent} />
        </Press>
        {/* "Obturator": the camera's shutter disc lives INSIDE the solve bar —
            you press the shutter a second time and the problem gets solved.
            While solving, the disc itself spins. */}
        <Press onPress={confirm} disabled={busy || !box} containerStyle={styles.flexOne} style={styles.solveBar}>
          <View style={styles.disc}>
            <LinearGradient
              colors={theme.gradient.brand as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discInner}
            >
              {busy && <ActivityIndicator size="small" color="#FFFFFF" />}
            </LinearGradient>
          </View>
          <Txt size={16.5} color={V.text} style={[styles.solveLbl, { fontFamily: theme.font.display }]}>
            {t('crop.solve')}
          </Txt>
          <View style={styles.solveArrow}>
            <RezIcon name="forward" size={17} color={V.soft} accent={V.accent} />
          </View>
        </Press>
      </View>
    </View>
  )
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  host: { zIndex: 120, elevation: 24, backgroundColor: V.bg },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chromeBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: V.line,
    backgroundColor: V.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeGhost: { width: 40, height: 40 },
  chromeTitle: { letterSpacing: -0.2 },

  viewport: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: V.stage,
  },

  // guide corners
  frame: { position: 'absolute', left: '7%', right: '7%', top: '13%', height: '54%' },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: V.accent },
  cTL: { left: 0, top: 0, borderLeftWidth: 3.5, borderTopWidth: 3.5, borderTopLeftRadius: 10 },
  cTR: { right: 0, top: 0, borderRightWidth: 3.5, borderTopWidth: 3.5, borderTopRightRadius: 10 },
  cBL: { left: 0, bottom: 0, borderLeftWidth: 3.5, borderBottomWidth: 3.5, borderBottomLeftRadius: 10 },
  cBR: { right: 0, bottom: 0, borderRightWidth: 3.5, borderBottomWidth: 3.5, borderBottomRightRadius: 10 },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: '9%', alignItems: 'center' },
  hintPill: {
    backgroundColor: 'rgba(14,11,24,0.62)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },

  camBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 44,
    paddingTop: 18,
  },
  side: { alignItems: 'center', gap: 6, width: 60 },
  sideLbl: { letterSpacing: 0.3 },
  sideBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: V.line,
    backgroundColor: V.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warming: { marginTop: 10 },
  flash: { backgroundColor: '#FFFFFF' },
  shutterRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  deniedPad: { paddingHorizontal: 34 },
  deniedTxt: { textAlign: 'center', marginTop: 12, marginBottom: 18, lineHeight: 21 },
  settingsBtn: {
    backgroundColor: V.accent,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },

  // trim stage
  dim: { position: 'absolute', backgroundColor: V.scrim },
  trimBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: V.accent,
    borderRadius: 12,
  },
  handleHit: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // L-bracket corners — the crop tool vernacular, not toy circles.
  bracket: { width: 26, height: 26, borderColor: '#FFFFFF' },
  bTL: { borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 10 },
  bTR: { borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 10 },
  bBL: { borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 10 },
  bBR: { borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 10 },
  // Midpoint edge bars: one-finger height/width tweaks for wide problem strips.
  edgeHitH: { position: 'absolute', width: 60, height: 36, alignItems: 'center', justifyContent: 'center' },
  edgeHitV: { position: 'absolute', width: 36, height: 60, alignItems: 'center', justifyContent: 'center' },
  edgeBarH: { width: 32, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  edgeBarV: { width: 5, height: 32, borderRadius: 3, backgroundColor: '#FFFFFF' },
  hintTopWrap: { position: 'absolute', left: 0, right: 0, top: 14, alignItems: 'center' },
  trimBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // "Obturator" bar — compact icon tile + a solve bar carrying the shutter disc.
  flexOne: { flex: 1 },
  ghostTile: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#161027',
    borderWidth: 1,
    borderColor: 'rgba(160,140,255,0.40)',
    paddingLeft: 9,
    paddingRight: 16,
    shadowColor: '#6355FF',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discInner: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  solveLbl: { flex: 1, letterSpacing: -0.2 },
  solveArrow: { opacity: 0.7 },
})
