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
  useWindowDimensions,
  View,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import CrossFade from '../components/ui/CrossFade'
import Press from '../components/ui/Press'
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
  bg: '#0C0F14',
  stage: '#171C26',
  line: 'rgba(255,255,255,0.16)',
  fill: 'rgba(255,255,255,0.06)',
  text: '#F2F5FA',
  soft: '#CDD6E4',
  faint: '#98A2B4',
  accent: '#7E97FF',
  onAccent: '#0C0F14',
  scrim: 'rgba(8,10,14,0.6)',
}

type Box = { x: number; y: number; w: number; h: number }
type Rect = { x: number; y: number; w: number; h: number; s: number }

const MIN_BOX = 64 // dp — smallest the trim box can be pinched to

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
  const { height: winH } = useWindowDimensions()
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
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
  const slide = useRef(new Animated.Value(0)).current
  const pickingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const slideIn = useCallback(() => {
    setMounted(true)
    Animated.timing(slide, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [slide])

  useEffect(() => {
    if (open === 'camera') {
      Keyboard.dismiss() // the visor is fullscreen — never let the keyboard sit over it
      entryRef.current = 'camera'
      setShot(null)
      setStage('camera')
      slideIn()
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
              slideIn()
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
      // Slide out with the CURRENT stage frozen; reset only once hidden.
      Animated.timing(slide, { toValue: 0, duration: 230, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        setMounted(false)
        setShot(null)
        setStage('camera')
      })
    }
  }, [open, slide, slideIn])

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
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.host,
        { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [winH, 0] }) }] },
      ]}
    >
      <StatusBar style="light" />
      <CrossFade dep={stage} style={styles.flex} scaleFrom={0.985}>
        {stage === 'trim' && shot ? (
          <TrimStage
            shot={shot}
            backIcon={entryRef.current === 'camera' ? 'arrow-left' : 'x'}
            onBack={backFromTrim}
            ghostLabel={shot.source === 'camera' ? t('crop.retake') : t('crop.chooseAnother')}
            onGhost={shot.source === 'camera' ? retake : repick}
            onUsePhoto={onUsePhoto}
          />
        ) : (
          <CameraStage
            onShot={(s) => showTrim(s, 'camera')}
            onPick={(s) => showTrim(s, 'library')}
            onClose={onClose}
            onTypeInstead={onTypeInstead}
          />
        )}
      </CrossFade>
    </Animated.View>
  )
}

/* ------------------------------ camera stage ------------------------------ */

function CameraStage({
  onShot,
  onPick,
  onClose,
  onTypeInstead,
}: {
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

  // Ask once, the moment the camera stage mounts — never in a loop. If it's
  // refused, the panel below offers a manual retry (or Settings on "never").
  const askedRef = useRef(false)
  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain && !askedRef.current) {
      askedRef.current = true
      requestPerm()
    }
  }, [perm, requestPerm])

  const snap = useCallback(async () => {
    if (!ready || busy || !cam.current) return
    setBusy(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    Animated.sequence([
      Animated.timing(shutter, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(shutter, { toValue: 0, useNativeDriver: true, damping: 12, stiffness: 320 }),
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
          <Feather name="x" size={19} color={V.text} />
        </Press>
        <Txt size={11} color={V.soft} style={[styles.chromeTitle, { fontFamily: theme.font.mono }]}>
          {t('capture.title').toUpperCase()}
        </Txt>
        <Press
          onPress={() => setTorch((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.torch')}
          style={[styles.chromeBtn, torch && { backgroundColor: 'rgba(126,151,255,0.22)', borderColor: V.accent }]}
        >
          <Feather name={torch ? 'zap' : 'zap-off'} size={17} color={torch ? V.accent : V.text} />
        </Press>
      </View>

      {/* viewfinder — contained with rounded corners, so it reads as Rezolvo's
          own surface rather than a fullscreen system camera */}
      <View style={styles.viewport}>
        {perm?.granted ? (
          <CameraView
            ref={cam}
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            enableTorch={torch}
            onCameraReady={() => setReady(true)}
          />
        ) : perm ? (
          <View style={[styles.flex, styles.center, styles.deniedPad]}>
            <Feather name="camera-off" size={30} color={V.faint} />
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
          <View style={[styles.flex, styles.center]}>
            <ActivityIndicator color={V.accent} />
          </View>
        )}

        {perm?.granted && (
          <>
            {/* guide frame */}
            <View pointerEvents="none" style={styles.frame}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
            </View>
            <View pointerEvents="none" style={styles.hintWrap}>
              <View style={styles.hintPill}>
                <Txt size={12.5} weight="semibold" color={V.soft}>
                  {t('capture.hint')}
                </Txt>
              </View>
            </View>
          </>
        )}
      </View>

      {/* bottom controls: gallery · shutter · type-instead */}
      <View style={[styles.camBar, { paddingBottom: insets.bottom + 14 }]}>
        <Press onPress={pick} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('hero.library')} style={styles.sideBtn}>
          <Feather name="image" size={20} color={V.text} />
        </Press>
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
        <Press onPress={onTypeInstead} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('capture.typeInstead')} style={styles.sideBtn}>
          <Feather name="type" size={20} color={V.text} />
        </Press>
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
  onGhost,
  onUsePhoto,
}: {
  shot: RawShot
  /** 'arrow-left' when a camera sits behind this stage, 'x' when Home does. */
  backIcon: 'arrow-left' | 'x'
  onBack: () => void
  /** "Refă" (retake) for camera shots, "Alege alta" (re-pick) for gallery picks. */
  ghostLabel: string
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
    const make = (kind: 'tl' | 'tr' | 'bl' | 'br' | 'move') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRef.current = boxRef.current
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
          if (kind === 'tl' || kind === 'bl') {
            x = clamp(s.x + g.dx, R.x, right - MIN_BOX)
            w = right - x
          } else {
            w = clamp(s.w + g.dx, MIN_BOX, R.x + R.w - s.x)
          }
          if (kind === 'tl' || kind === 'tr') {
            y = clamp(s.y + g.dy, R.y, bottom - MIN_BOX)
            h = bottom - y
          } else {
            h = clamp(s.h + g.dy, MIN_BOX, R.y + R.h - s.y)
          }
          setBox({ x, y, w, h })
        },
      })
    return { tl: make('tl'), tr: make('tr'), bl: make('bl'), br: make('br'), move: make('move') }
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
          <Feather name={backIcon} size={19} color={V.text} />
        </Press>
        <Txt size={11} color={V.soft} style={[styles.chromeTitle, { fontFamily: theme.font.mono }]}>
          {t('crop.title').toUpperCase()}
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

            {/* the box itself — draggable body + four corner handles */}
            <View
              {...responders.move.panHandlers}
              style={[styles.trimBox, { left: box.x, top: box.y, width: box.w, height: box.h }]}
            />
            <View {...responders.tl.panHandlers} style={[styles.handleHit, { left: box.x - 22, top: box.y - 22 }]}>
              <View style={styles.handle} />
            </View>
            <View {...responders.tr.panHandlers} style={[styles.handleHit, { left: box.x + box.w - 22, top: box.y - 22 }]}>
              <View style={styles.handle} />
            </View>
            <View {...responders.bl.panHandlers} style={[styles.handleHit, { left: box.x - 22, top: box.y + box.h - 22 }]}>
              <View style={styles.handle} />
            </View>
            <View {...responders.br.panHandlers} style={[styles.handleHit, { left: box.x + box.w - 22, top: box.y + box.h - 22 }]}>
              <View style={styles.handle} />
            </View>
          </>
        )}
      </View>

      <View style={[styles.trimBar, { paddingBottom: insets.bottom + 14 }]}>
        <Press onPress={onGhost} disabled={busy} containerStyle={styles.flexOne} style={[styles.trimBtn, styles.ghostBtn]}>
          <Txt size={14.5} weight="semibold" color={V.soft}>
            {ghostLabel}
          </Txt>
        </Press>
        <Press onPress={confirm} disabled={busy || !box} containerStyle={styles.flexTwo} style={[styles.trimBtn, styles.goBtn]}>
          {busy ? (
            <ActivityIndicator color={V.onAccent} />
          ) : (
            <View style={styles.goInner}>
              <Txt size={14.5} weight="bold" color={V.onAccent}>
                {t('crop.solve')}
              </Txt>
              <Feather name="arrow-right" size={17} color={V.onAccent} />
            </View>
          )}
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
  chromeTitle: { letterSpacing: 2 },

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
    backgroundColor: 'rgba(20,25,34,0.62)',
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
  handle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: V.accent,
  },
  trimBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  trimBtn: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: { flex: 1 },
  flexTwo: { flex: 2 },
  ghostBtn: { borderWidth: 1, borderColor: V.line, backgroundColor: V.fill },
  goBtn: { backgroundColor: V.accent },
  goInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
