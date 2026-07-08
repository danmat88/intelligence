import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import BrandGradient from '../ui/BrandGradient'

/**
 * Bottom input bar wrapped in a slowly revolving gradient rim - the app's
 * heartbeat. Growing text field + circular gradient send button that turns
 * into a stop button while a reply is streaming.
 */
export default function Composer({
  onSend,
  onStop,
  sending,
}: {
  onSend: (t: string) => void
  onStop: () => void
  sending: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [text, setText] = useState('')

  // the rim: two rounded gradient borders crossfading - reads as light slowly
  // traveling around the input, with zero clipping tricks (Android-safe)
  const breathe = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [breathe])

  const canSend = text.trim().length > 0 && !sending
  const submit = () => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  const brand = theme.gradient.brand

  return (
    <View style={[styles.rim, { borderRadius: theme.radius.xl }]}>
      <LinearGradient
        colors={[brand[0] + '8C', brand[1] + '30', brand[2] + '8C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.xl }]}
        pointerEvents="none"
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.xl, opacity: breathe }]}
      >
        <LinearGradient
          colors={[brand[2] + '8C', brand[0] + '30', brand[1] + '8C']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.xl }]}
        />
      </Animated.View>

      <View style={[styles.wrap, { backgroundColor: c.surface, borderRadius: theme.radius.xl - 2 }]}>
        <TextInput
          autoFocus
          style={[styles.input, { color: c.text, fontFamily: theme.font.regular }]}
          placeholder="Message Intelligence..."
          placeholderTextColor={c.textFaint}
          value={text}
          onChangeText={setText}
          multiline
          editable={!sending}
        />
        <Pressable
          onPress={sending ? onStop : submit}
          disabled={!sending && !canSend}
          style={styles.sendWrap}
          hitSlop={4}
        >
          {sending ? (
            <View style={[styles.send, { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }]}>
              <View style={[styles.stopSquare, { backgroundColor: c.text }]} />
            </View>
          ) : canSend ? (
            <BrandGradient style={styles.send}>
              <Feather name="arrow-up" size={20} color={c.onAccent} />
            </BrandGradient>
          ) : (
            <View style={[styles.send, { backgroundColor: c.surfaceAlt }]}>
              <Feather name="arrow-up" size={20} color={c.textFaint} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  rim: { padding: 1.5 },
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 140, paddingVertical: 8 },
  sendWrap: { justifyContent: 'flex-end' },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 13, height: 13, borderRadius: 3 },
})
