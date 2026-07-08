import { memo, useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
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

  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
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
      </View>
    )
  }

  return (
    <View style={styles.botRow}>
      <BrandGradient style={styles.avatar}>
        <Ionicons name="sparkles" size={15} color={c.onAccent} />
      </BrandGradient>
      <View style={styles.botBody}>
        {message.pending && !message.text ? (
          <TypingDots color={c.textFaint} />
        ) : message.error ? (
          <Txt size={16} color={c.danger} style={{ lineHeight: 25 }}>
            {message.text}
          </Txt>
        ) : (
          <Markdown text={message.text} />
        )}
      </View>
    </View>
  )
}

export default memo(Message)

function TypingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ]
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    )
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [])
  return (
    <View style={styles.dots}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: color, opacity: d }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '86%', paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1 },
  botRow: { flexDirection: 'row', gap: 12, paddingRight: 8 },
  avatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  botBody: { flex: 1, paddingTop: 3 },
  dots: { flexDirection: 'row', gap: 5, paddingVertical: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
})
