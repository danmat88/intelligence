import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { BackHandler, Keyboard, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
} from 'react-native-reanimated'
import { useOverlayHost } from './OverlayHost'

const EASE = Easing.bezier(0.22, 1, 0.36, 1)

/**
 * Full-window surface shared by sheets and dialogs. The root overlay host
 * places every transient surface above the complete application shell,
 * including the global dock, without opening a second native Android window.
 *
 * The host stays mounted through the exit animation, so navigation cannot
 * flash through or receive touches before the panel has fully left.
 */
export default function Overlay({
  open,
  onClose,
  align = 'bottom',
  children,
}: {
  open: boolean
  onClose: () => void
  align?: 'bottom' | 'center'
  children: ReactNode
}) {
  const host = useOverlayHost()
  const id = useRef(`overlay-${Math.random().toString(36).slice(2)}`).current
  const reduceMotion = useReducedMotion()
  const enterMs = reduceMotion ? 1 : 400
  const exitMs = reduceMotion ? 1 : 280
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (!mounted) return
    const timer = setTimeout(() => setMounted(false), exitMs + 40)
    return () => clearTimeout(timer)
  }, [exitMs, mounted, open])

  useEffect(() => {
    Keyboard.dismiss()
  }, [open])

  useEffect(() => {
    if (!open) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => subscription.remove()
  }, [onClose, open])

  const node = (
    <View style={styles.host} pointerEvents="auto">
      {open && (
        <>
          <Animated.View
            entering={FadeIn.duration(reduceMotion ? 1 : 240)}
            exiting={FadeOut.duration(reduceMotion ? 1 : 220)}
            style={[StyleSheet.absoluteFill, styles.scrim]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            pointerEvents="box-none"
            entering={SlideInDown.duration(enterMs).easing(EASE)}
            exiting={SlideOutDown.duration(exitMs).easing(Easing.in(Easing.cubic))}
            style={align === 'bottom' ? styles.bottom : styles.center}
          >
            {children}
          </Animated.View>
        </>
      )}
    </View>
  )

  useLayoutEffect(() => {
    if (mounted) host.set(id, node)
    else host.remove(id)
  }, [host, id, mounted, node])

  useEffect(() => () => host.remove(id), [host, id])

  return null
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
  },
  scrim: { backgroundColor: 'rgba(15,12,24,0.72)' },
  bottom: { bottom: 8, left: 10, position: 'absolute', right: 10 },
  center: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 22,
    position: 'absolute',
    right: 0,
    top: 0,
  },
})
