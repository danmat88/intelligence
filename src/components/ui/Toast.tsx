import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'

type ToastIcon = keyof typeof Feather.glyphMap

type ToastAction = { label: string; onPress: () => void }

type ToastContextValue = {
  /** Show a themed toast pill at the top of the screen for ~2s.
   *  With an `action` (e.g. Undo) it stays longer and is tappable. */
  show: (message: string, icon?: ToastIcon, action?: ToastAction) => void
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
  const [msg, setMsg] = useState<{ text: string; icon: ToastIcon; action?: ToastAction } | null>(null)
  const anim = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    Animated.timing(anim, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMsg(null))
  }, [anim])

  const show = useCallback(
    (text: string, icon: ToastIcon = 'check', action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current)
      setMsg({ text, icon, action })
      Animated.timing(anim, { toValue: 1, duration: 460, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }).start()
      // An actionable toast lingers long enough to actually be used.
      timer.current = setTimeout(hide, action ? 5000 : 2100)
    },
    [anim, hide],
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {msg && (
        <Animated.View
          pointerEvents={msg.action ? 'box-none' : 'none'}
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
          {msg.action && (
            <Pressable
              onPress={() => {
                msg.action?.onPress()
                hide()
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.action, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
            >
              <Txt size={13} weight="bold" color={c.accent}>
                {msg.action.label}
              </Txt>
            </Pressable>
          )}
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
  action: { marginLeft: 4, paddingLeft: 12, borderLeftWidth: 1, paddingVertical: 2 },
})
