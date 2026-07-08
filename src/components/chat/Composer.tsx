import { useEffect, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import BrandGradient from '../ui/BrandGradient'

/**
 * The composer: gradient-rimmed container with the text field on top and a
 * toolbar row beneath - model chip on the left, send/stop on the right
 * (the ChatGPT arrangement). No idle motion.
 */
export default function Composer({
  onSend,
  onStop,
  sending,
  modelLabel,
  onModelPress,
}: {
  onSend: (t: string) => void
  onStop: () => void
  sending: boolean
  modelLabel: string
  onModelPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [text, setText] = useState('')

  const canSend = text.trim().length > 0 && !sending
  const submit = () => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  // the action button pops softly whenever it changes role (idle/send/stop)
  const mode = sending ? 'stop' : canSend ? 'send' : 'idle'
  const prevMode = useRef(mode)
  const pop = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (prevMode.current === mode) return
    prevMode.current = mode
    pop.setValue(0.72)
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 320 }).start()
  }, [mode, pop])

  const brand = theme.gradient.brand

  return (
    <View style={[styles.rim, { borderRadius: theme.radius.xl }]}>
      <LinearGradient
        colors={[brand[0] + '73', brand[1] + '73']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.xl }]}
        pointerEvents="none"
      />
      <View style={[styles.wrap, { backgroundColor: c.surface, borderRadius: theme.radius.xl - 2 }]}>
        <TextInput
          style={[styles.input, { color: c.text, fontFamily: theme.font.regular }]}
          placeholder="Message Intelligence..."
          placeholderTextColor={c.textFaint}
          value={text}
          onChangeText={setText}
          multiline
        />

        <View style={styles.toolbar}>
          <Pressable
            onPress={onModelPress}
            hitSlop={6}
            style={({ pressed }) => [
              styles.modelChip,
              { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <BrandGradient style={styles.modelDot} />
            <Txt13 color={c.textMuted} family={theme.font.medium}>
              {modelLabel}
            </Txt13>
            <Feather name="chevron-up" size={13} color={c.textFaint} />
          </Pressable>

          <Pressable
            onPress={sending ? onStop : submit}
            disabled={!sending && !canSend}
            hitSlop={4}
          >
            <Animated.View style={{ transform: [{ scale: pop }] }}>
              {sending ? (
                <View style={[styles.send, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }]}>
                  <View style={[styles.stopSquare, { backgroundColor: c.text }]} />
                </View>
              ) : canSend ? (
                <BrandGradient style={styles.send}>
                  <Feather name="arrow-up" size={19} color={c.onAccent} />
                </BrandGradient>
              ) : (
                <View style={[styles.send, { backgroundColor: c.surfaceAlt }]}>
                  <Feather name="arrow-up" size={19} color={c.textFaint} />
                </View>
              )}
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

/** Tiny convenience for the chip label. */
function Txt13({ children, color, family }: { children: string; color: string; family: string }) {
  return <Text style={{ fontSize: 13, color, fontFamily: family }}>{children}</Text>
}

const styles = StyleSheet.create({
  rim: { padding: 1.5 },
  wrap: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  input: { fontSize: 16, lineHeight: 22, maxHeight: 110, paddingVertical: 8, paddingHorizontal: 6 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
  },
  modelDot: { width: 9, height: 9, borderRadius: 5 },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 12, height: 12, borderRadius: 3 },
})
