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
          { backgroundColor: c.surface, borderColor: focused ? c.accent : c.border },
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
          { backgroundColor: canSubmit ? c.accent : c.surfaceAlt },
          !canSubmit && styles.disabled,
        ]}
      >
        <RezIcon name="solve" size={19} color={canSubmit ? '#FFFFFF' : c.textFaint} accent={c.sunny} />
        <Txt weight="bold" size={14} color={canSubmit ? '#FFFFFF' : c.textFaint}>
          Rezolvă problema
        </Txt>
      </Press>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  editor: { borderRadius: 17, borderWidth: 1.5, minHeight: 132, overflow: 'hidden' },
  editorFocused: { minHeight: 108 },
  input: { flex: 1, fontSize: 16, lineHeight: 23, minHeight: 132, padding: 14 },
  inputFocused: { minHeight: 108 },
  submit: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
  },
  disabled: { opacity: 0.72 },
})
