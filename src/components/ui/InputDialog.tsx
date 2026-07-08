import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Overlay from './Overlay'
import Txt from './Txt'

/** Themed text-input dialog on the app's own overlay engine (e.g. Rename). */
export default function InputDialog({
  open,
  title,
  initialValue,
  placeholder,
  submitLabel = 'Save',
  onSubmit,
  onClose,
}: {
  open: boolean
  title: string
  initialValue: string
  placeholder?: string
  submitLabel?: string
  onSubmit: (value: string) => void
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [value, setValue] = useState(initialValue)

  // fresh dialog every time it opens
  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  const canSubmit = value.trim().length > 0
  const submit = () => {
    if (!canSubmit) return
    onClose()
    onSubmit(value.trim())
  }

  return (
    <Overlay open={open} onClose={onClose} align="center">
      <View style={[styles.card, { backgroundColor: c.bgElevated, borderColor: c.border, borderRadius: theme.radius.lg }]}>
        <Txt size={18} style={{ fontFamily: theme.font.display }}>
          {title}
        </Txt>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={c.textFaint}
          autoFocus
          selectTextOnFocus
          maxLength={60}
          onSubmitEditing={submit}
          returnKeyType="done"
          style={[
            styles.input,
            {
              color: c.text,
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: theme.radius.md,
              fontFamily: theme.font.regular,
            },
          ]}
        />
        <View style={styles.row}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.btn, { borderColor: c.border, borderWidth: 1, opacity: pressed ? 0.6 : 1 }]}
          >
            <Txt weight="semibold" size={14.5} color={c.textMuted}>
              Cancel
            </Txt>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: c.accent, opacity: !canSubmit ? 0.4 : pressed ? 0.75 : 1 },
            ]}
          >
            <Txt weight="semibold" size={14.5} color={c.onAccent}>
              {submitLabel}
            </Txt>
          </Pressable>
        </View>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 400, borderWidth: 1, padding: 22, gap: 12 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
})
