import { useEffect, type ReactNode } from 'react'
import { BackHandler, Keyboard, Pressable, StyleSheet, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated'

const EASE = Easing.bezier(0.22, 1, 0.36, 1)

/**
 * The app's own modal engine - no react-native Modal, no separate Android
 * window, no system quirks. Renders in-tree as an absolute layer we fully
 * control: a fading backdrop scrim, and content that slides in FULLY from
 * below the screen — bottom sheets and centered dialogs alike. The content
 * itself never fades or scales (only the scrim may fade; elements move,
 * fully opaque). All animation runs on the UI thread (Reanimated), so heavy
 * content mounting on the JS thread can't stutter the slide. Hardware back
 * closes it.
 *
 * Render it as a late sibling at screen root so it stacks above everything.
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
  const reduceMotion = useReducedMotion()
  const enterMs = reduceMotion ? 1 : 400
  const exitMs = reduceMotion ? 1 : 280
  useEffect(() => {
    // Keyboard rule: an overlay is a context switch — the keyboard never
    // stays up across one, in either direction (covers "open settings with
    // the keyboard up" and "keyboard lingering after the sheet closes").
    Keyboard.dismiss()
  }, [open])

  // hardware back closes the overlay instead of the screen
  useEffect(() => {
    if (!open) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [open, onClose])

  if (!open) return null

  return (
    <View style={[StyleSheet.absoluteFill, styles.host]} pointerEvents="box-none">
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
    </View>
  )
}

const styles = StyleSheet.create({
  host: { zIndex: 100 },
  scrim: { backgroundColor: 'rgba(15,12,24,0.72)' },
  bottom: { position: 'absolute', left: 10, right: 10, bottom: 8 },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 22 },
})
