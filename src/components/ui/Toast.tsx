import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'

type ToastIcon = keyof typeof Feather.glyphMap

type ToastContextValue = {
  /** Show a themed toast pill at the top of the screen for ~2s. */
  show: (message: string, icon?: ToastIcon) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * The app's own toast system - replaces the stock OS toast so feedback looks
 * like it belongs: a floating pill that springs in below the status bar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const [msg, setMsg] = useState<{ text: string; icon: ToastIcon } | null>(null)
  const anim = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(
    (text: string, icon: ToastIcon = 'check') => {
      if (timer.current) clearTimeout(timer.current)
      setMsg({ text, icon })
      Animated.timing(anim, { toValue: 1, duration: 460, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start()
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMsg(null))
      }, 2100)
    },
    [anim],
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: insets.top + 12,
              backgroundColor: c.surface,
              borderColor: c.border,
              // Pure slide from above the screen edge — no fade, no scale:
              // the pill arrives fully opaque, like it was pushed in.
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-(insets.top + 92), 0] }) },
              ],
            },
          ]}
        >
          <Feather name={msg.icon} size={14} color={c.accent} />
          <Txt size={13.5} weight="medium">
            {msg.text}
          </Txt>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#1A1626',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
})
