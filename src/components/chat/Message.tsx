import { memo, useEffect, useRef, type ReactNode } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useToast } from '../ui/Toast'
import Txt from '../ui/Txt'
import Markdown from '../ui/Markdown'
import BrandGradient from '../ui/BrandGradient'
import type { Message as Msg } from '../../chat/store'

/**
 * One chat row: user = right-aligned bubble, assistant = full-width text with
 * a mark. Memoized so settled rows don't re-render on every streamed token of
 * the live reply (only the draft row's message object changes identity).
 */
function Message({ message }: { message: Msg }) {
  const { theme } = useTheme()
  const c = theme.colors
  const toast = useToast()

  const copy = () => {
    if (!message.text) return
    Clipboard.setStringAsync(message.text)
    toast.show('Copied', 'copy')
  }

  if (message.role === 'user') {
    return (
      <Entrance>
        <Pressable onLongPress={copy} style={styles.userRow}>
          <View
            style={[
              styles.userBubble,
              { backgroundColor: c.surfaceAlt, borderColor: c.border, borderRadius: theme.radius.lg },
            ]}
          >
            <Txt size={16} style={{ lineHeight: 23 }}>
              {message.text}
            </Txt>
          </View>
        </Pressable>
      </Entrance>
    )
  }

  return (
    <Entrance>
      <Pressable onLongPress={copy} style={styles.botRow}>
        <AvatarMark active={!!message.streaming} />
        <View style={styles.botBody}>
          {message.pending && !message.text ? (
            <ThinkingOrb />
          ) : message.error ? (
            <Txt size={16} color={c.danger} style={{ lineHeight: 25 }}>
              {message.text}
            </Txt>
          ) : (
            // a soft cursor rides the end of the text while tokens stream in
            <Markdown text={message.streaming ? `${message.text} ▍` : message.text} />
          )}
        </View>
      </Pressable>
    </Entrance>
  )
}

export default memo(Message)

/** Fade-and-rise on mount, so new messages arrive instead of popping. */
function Entrance({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(8)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start()
  }, [opacity, rise])
  return <Animated.View style={{ opacity, transform: [{ translateY: rise }] }}>{children}</Animated.View>
}

/** The assistant mark; it breathes while the reply is streaming. */
function AvatarMark({ active }: { active: boolean }) {
  const { theme } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!active) {
      scale.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.14, duration: 620, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 620, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [active, scale])
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <BrandGradient style={styles.avatar}>
        <Ionicons name="sparkles" size={15} color={theme.colors.onAccent} />
      </BrandGradient>
    </Animated.View>
  )
}

/** Pre-first-token state: a slowly revolving, pulsing gradient orb. */
function ThinkingOrb() {
  const pulse = useRef(new Animated.Value(0)).current
  const spin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ),
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3200, useNativeDriver: true })),
    ]
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [pulse, spin])
  return (
    <Animated.View
      style={{
        width: 26,
        height: 26,
        marginVertical: 4,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
        transform: [
          { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.12] }) },
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
        ],
      }}
    >
      <BrandGradient style={{ flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)' }} />
      </BrandGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '86%', paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1 },
  botRow: { flexDirection: 'row', gap: 12, paddingRight: 8 },
  avatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  botBody: { flex: 1, paddingTop: 3 },
})
