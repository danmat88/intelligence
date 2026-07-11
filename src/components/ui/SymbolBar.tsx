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
          <Txt size={16} weight="medium" color={c.text}>
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
    minWidth: 42,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    shadowColor: '#1A1626',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
})
