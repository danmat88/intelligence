import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Animated, BackHandler, Keyboard, Pressable, StyleSheet, View } from 'react-native'

/**
 * The app's own modal engine - no react-native Modal, no separate Android
 * window, no system quirks. Renders in-tree as an absolute layer we fully
 * control: animated backdrop, spring-in content (slide for bottom sheets,
 * scale for centered dialogs), hardware back closes it.
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

  useEffect(() => {
    // Keyboard rule: an overlay is a context switch — the keyboard never
    // stays up across one, in either direction (covers "open settings with
    // the keyboard up" and "keyboard lingering after the sheet closes").
    Keyboard.dismiss()
    if (open) {
      setMounted(true)
      Animated.spring(p, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 260, mass: 0.9 }).start()
    } else {
      Animated.timing(p, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setMounted(false))
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
  const contentStyle =
    align === 'bottom'
      ? { transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [48, 0], ...clamp }) }] }
      : {
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], ...clamp }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1], ...clamp }) }],
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
