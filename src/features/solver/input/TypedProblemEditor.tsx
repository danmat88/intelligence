import type { RefObject } from 'react'
import { StyleSheet, TextInput, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native'
import MathPreview from '../../../components/ui/MathPreview'
import Press from '../../../components/ui/Press'
import RezIcon from '../../../components/ui/RezIcon'
import SymbolBar, { type MathKey } from '../../../components/ui/SymbolBar'
import Txt from '../../../components/ui/Txt'
import { useTheme } from '../../../theme/ThemeProvider'

type Selection = { start: number; end: number }

type Props = {
  inputRef: RefObject<TextInput | null>
  value: string
  focused: boolean
  selection?: Selection
  previewLatex: string
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onSelectionChange: (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void
  onInsertSymbol: (symbol: MathKey) => void
  onSubmit: () => void
}

export default function TypedProblemEditor({
  inputRef,
  value,
  focused,
  selection,
  previewLatex,
  onChange,
  onFocus,
  onBlur,
  onSelectionChange,
  onInsertSymbol,
  onSubmit,
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  const canSubmit = !!value.trim()

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.editor,
          focused && styles.editorFocused,
          { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            focused && styles.inputFocused,
            { color: c.text, fontFamily: theme.font.regular },
          ]}
          placeholder="Scrie enunțul complet…"
          placeholderTextColor={c.textFaint}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          selection={selection}
          onSelectionChange={onSelectionChange}
          multiline
          textAlignVertical="top"
          maxFontSizeMultiplier={1.2}
        />
      </View>

      {!!previewLatex && <MathPreview latex={previewLatex} label="PREVIZUALIZARE" />}
      {(focused || canSubmit) && <SymbolBar onInsert={onInsertSymbol} />}

      <Press
        onPress={onSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Rezolvă problema scrisă"
        style={[
          styles.submit,
          {
            backgroundColor: canSubmit ? c.accent : c.surfaceAlt,
            borderColor: c.border,
            borderBottomColor: c.border,
          },
          !canSubmit && styles.disabled,
        ]}
      >
        <RezIcon name="solve" size={24} color={canSubmit ? '#FFFFFF' : c.textFaint} accent={c.text} />
        <Txt weight="extrabold" size={17} color={canSubmit ? '#FFFFFF' : c.textFaint} style={{ fontFamily: theme.font.display }}>
          Rezolvă problema
        </Txt>
      </Press>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  editor: { borderRadius: 24, borderWidth: 3, borderBottomWidth: 8, minHeight: 160, overflow: 'hidden' },
  editorFocused: { minHeight: 140 },
  input: { flex: 1, fontSize: 18, lineHeight: 26, minHeight: 160, padding: 18 },
  inputFocused: { minHeight: 140 },
  submit: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 72,
  },
  disabled: { opacity: 0.72 },
})
