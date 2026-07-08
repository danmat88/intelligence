import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import BrandGradient from '../ui/BrandGradient'
import Txt from '../ui/Txt'

const SUGGESTIONS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'cpu', text: 'Explain quantum computing simply' },
  { icon: 'feather', text: 'Write a haiku about the sea' },
  { icon: 'map-pin', text: 'Plan a weekend in Rome' },
  { icon: 'code', text: 'Why is my useEffect looping?' },
]

/** Shown when a conversation has no messages yet — greeting + tappable prompts. */
export default function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={styles.wrap}>
      <BrandGradient style={styles.mark}>
        <Ionicons name="sparkles" size={26} color={c.onAccent} />
      </BrandGradient>
      <Txt weight="extrabold" size={26} style={{ letterSpacing: -0.5 }}>
        How can I help?
      </Txt>
      <Txt size={15} color={c.textMuted} style={{ marginBottom: 10 }}>
        Ask anything, or try one of these
      </Txt>
      <View style={styles.chips}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.text}
            onPress={() => onPick(s.text)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name={s.icon} size={16} color={c.accent} style={{ marginRight: 12 }} />
            <Txt size={15} style={{ flex: 1, lineHeight: 20 }}>
              {s.text}
            </Txt>
            <Feather name="arrow-up-right" size={16} color={c.textFaint} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 8 },
  mark: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  chips: { width: '100%', gap: 10, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderWidth: 1 },
})
