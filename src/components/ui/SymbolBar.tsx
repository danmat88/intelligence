import { ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import Press from './Press'
import Txt from './Txt'

/**
 * The math key row. TEMPLATE keys (violet) insert a whole structure and park
 * the caret inside it — tap "fraction" and you get `()/()` with the cursor in
 * the numerator. Symbol keys insert a character. Everything the student types
 * stays plain text (native keyboard, nothing to clip or break); the preview
 * above the composer shows it typeset.
 */

export type MathKey = {
  /** What gets typed. */
  insert: string
  /** How many characters to walk the caret BACK from the end of `insert`. */
  back: number
  /** True for structure keys — they wear the accent. */
  tpl?: boolean
}

const KEYS: (MathKey & { label: string; sup?: string })[] = [
  { label: '▯/▯', insert: '()/()', back: 4, tpl: true },
  { label: '▯²', insert: '^2', back: 0, tpl: true },
  { label: '▯ⁿ', insert: '^', back: 0, tpl: true },
  { label: '√▯', insert: 'sqrt()', back: 1, tpl: true },
  { label: '∛▯', insert: 'cbrt()', back: 1, tpl: true },
  { label: '( )', insert: '()', back: 1, tpl: true },
  { label: 'x', insert: 'x', back: 0 },
  { label: 'y', insert: 'y', back: 0 },
  { label: '∫', insert: '∫ ', back: 0 },
  { label: 'Σ', insert: 'Σ', back: 0 },
  { label: 'lim', insert: 'lim ', back: 0 },
  { label: 'π', insert: 'π', back: 0 },
  { label: 'θ', insert: 'θ', back: 0 },
  { label: '≤', insert: '≤', back: 0 },
  { label: '≥', insert: '≥', back: 0 },
  { label: '≠', insert: '≠', back: 0 },
  { label: '±', insert: '±', back: 0 },
]

export default function SymbolBar({ onInsert }: { onInsert: (key: MathKey) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.row}
    >
      {KEYS.map((k) => (
        <Press
          key={k.label}
          onPress={() => onInsert(k)}
          scaleTo={0.88}
          style={[
            styles.key,
            k.tpl
              ? { backgroundColor: c.accentSoft, borderColor: 'rgba(99,85,255,0.35)' }
              : { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <View style={styles.center}>
            <Txt
              size={k.label.length > 2 ? 12.5 : 15.5}
              weight={k.tpl ? 'semibold' : 'medium'}
              color={k.tpl ? c.accent : c.text}
              style={styles.glyph}
            >
              {k.label}
            </Txt>
          </View>
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
  center: { alignItems: 'center', justifyContent: 'center' },
  glyph: { includeFontPadding: false },
})
