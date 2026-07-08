import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import BrandGradient from '../ui/BrandGradient'

/**
 * Bottom input bar: growing text field + circular gradient send button that
 * turns into a stop button while a reply is streaming.
 * No lifecycle/keyboard tricks here - react-native-keyboard-controller keeps
 * the layout correct across minimize/restore, so the input just holds focus.
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

  const canSend = text.trim().length > 0 && !sending
  const submit = () => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius.xl },
      ]}
    >
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
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
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
