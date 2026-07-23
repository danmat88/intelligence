import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Animated, Easing, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import IconTile from './IconTile'
import Txt from './Txt'
import type { RezIconName } from './RezIcon'

type ToastIcon = 'check' | 'alert-triangle' | 'download-cloud' | 'info' | 'wifi-off' | 'clock' | 'trash-2'

function toastGlyph(icon: ToastIcon): RezIconName {
  if (icon === 'alert-triangle') return 'alert'
  if (icon === 'wifi-off') return 'offline'
  if (icon === 'clock') return 'history'
  if (icon === 'trash-2') return 'trash'
  if (icon === 'download-cloud') return 'practice'
  if (icon === 'info') return 'spark'
  return 'check'
}

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
    anim.stopAnimation()
    Animated.timing(anim, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMsg(null))
  }, [anim])

  const show = useCallback(
    (text: string, icon: ToastIcon = 'check', action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current)
      anim.stopAnimation()
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
              backgroundColor: c.text,
              borderColor: 'rgba(255,255,255,0.10)',
              // Pure slide from above the screen edge — no fade, no scale:
              // the pill arrives fully opaque, like it was pushed in.
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-(insets.top + 92), 0] }) },
              ],
            },
          ]}
        >
          <IconTile name={toastGlyph(msg.icon)} size={28} iconSize={14} tone="ink" />
          <Txt size={13.5} weight="medium" color="#fff">
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
              <Txt size={13} weight="bold" color="#A995FF">
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
    borderRadius: 17,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#15121F',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  action: { marginLeft: 4, paddingLeft: 12, borderLeftWidth: 1, paddingVertical: 2 },
})
