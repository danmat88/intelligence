import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, BackHandler, Easing, Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'

/**
 * The app's own modal engine - no react-native Modal, no separate Android
 * window, no system quirks. Renders in-tree as an absolute layer we fully
 * control: animated backdrop scrim, and content that slides in FULLY from
 * below the screen — bottom sheets and centered dialogs alike. The content
 * itself never fades and never scales (design rule: only the scrim may fade;
 * elements move, fully opaque). Hardware back closes it.
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
  const [mounted, setMounted] = useState(open)
  const p = useRef(new Animated.Value(0)).current
  const { height: winH } = useWindowDimensions()

  useEffect(() => {
    // Keyboard rule: an overlay is a context switch — the keyboard never
    // stays up across one, in either direction (covers "open settings with
    // the keyboard up" and "keyboard lingering after the sheet closes").
    Keyboard.dismiss()
    if (open) {
      setMounted(true)
      Animated.timing(p, { toValue: 1, duration: 500, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start()
    } else {
      Animated.timing(p, { toValue: 0, duration: 340, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false)
        },
      )
    }
  }, [open, p])

  // hardware back closes the overlay instead of the screen
  useEffect(() => {
    if (!open) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [open, onClose])

  if (!mounted) return null

  const clamp = { extrapolate: 'clamp' as const }
  const backdropOpacity = p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.62], ...clamp })
  // Full off-screen travel: at p=0 the content sits entirely below the screen.
  const contentStyle = {
    transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [winH, 0], ...clamp }) }],
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.host]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        pointerEvents="box-none"
        style={[align === 'bottom' ? styles.bottom : styles.center, contentStyle]}
      >
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: { zIndex: 100 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 28 },
})
