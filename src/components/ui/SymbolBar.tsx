import { ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import Txt from './Txt'

// Common math symbols. `label` is what the key shows; `insert` is what gets typed
// (readable forms the model understands: ^2 for squared, √, π, etc.).
const SYMBOLS: { label: string; insert: string }[] = [
  { label: 'x', insert: 'x' },
  { label: 'y', insert: 'y' },
  { label: 'x²', insert: '^2' },
  { label: 'xⁿ', insert: '^' },
  { label: '√', insert: '√' },
  { label: '÷', insert: '/' },
  { label: 'π', insert: 'π' },
  { label: 'θ', insert: 'θ' },
  { label: '∫', insert: '∫' },
  { label: 'Σ', insert: 'Σ' },
  { label: '≤', insert: '≤' },
  { label: '≥', insert: '≥' },
  { label: '≠', insert: '≠' },
  { label: '±', insert: '±' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
]

/** A horizontal strip of math symbols that insert into the composer. */
export default function SymbolBar({ onInsert }: { onInsert: (s: string) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.row}
    >
      {SYMBOLS.map((s) => (
        <Press
          key={s.label}
          onPress={() => onInsert(s.insert)}
          scaleTo={0.88}
          style={[styles.key, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Txt size={16} color={c.text} style={{ fontFamily: theme.font.serif }}>
            {s.label}
          </Txt>
        </Press>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 7, paddingHorizontal: 14, paddingBottom: 8 },
  key: {
    minWidth: 40,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
})
