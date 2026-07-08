import { Pressable, Share, StyleSheet, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useToast } from '../ui/Toast'
import Txt from '../ui/Txt'

/** Ghost actions under the latest reply: copy, regenerate, share. */
export default function ReplyActions({ text, onRegenerate }: { text: string; onRegenerate: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const toast = useToast()

  const copy = () => {
    Clipboard.setStringAsync(text)
    toast.show('Copied', 'copy')
  }
  const share = () => Share.share({ message: text }).catch(() => {})

  return (
    <View style={styles.row}>
      <Action icon="copy" label="Copy" onPress={copy} border={c.border} color={c.textMuted} />
      <Action icon="refresh-cw" label="Retry" onPress={onRegenerate} border={c.border} color={c.textMuted} />
      <Action icon="share-2" label="Share" onPress={share} border={c.border} color={c.textMuted} />
    </View>
  )
}

function Action({
  icon,
  label,
  onPress,
  border,
  color,
}: {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress: () => void
  border: string
  color: string
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.btn, { borderColor: border, opacity: pressed ? 0.55 : 1 }]}
    >
      <Feather name={icon} size={13} color={color} />
      <Txt size={12.5} color={color}>
        {label}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  // aligned with assistant text (avatar 30 + gap 12); sits under the newest reply
  row: { flexDirection: 'row', gap: 8, marginLeft: 42, marginTop: 2, marginBottom: 6 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
})
