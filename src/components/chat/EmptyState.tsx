import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import BrandGradient from '../ui/BrandGradient'
import Txt from '../ui/Txt'

/** Time-of-day greeting, personalized with the user's first name. */
function greeting(name?: string | null): string {
  const h = new Date().getHours()
  const base = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const first = name?.trim().split(/\s+/)[0]
  return first ? `${base}, ${first}` : base
}

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
  const { user } = useAuth()
  return (
    <View style={styles.wrap}>
      <Rise delay={0}>
        <BrandGradient style={styles.mark}>
          <Ionicons name="sparkles" size={26} color={c.onAccent} />
        </BrandGradient>
      </Rise>
      <Rise delay={60}>
        <Txt size={27} style={{ letterSpacing: -0.6, fontFamily: theme.font.display }}>
          {greeting(user?.name)}
        </Txt>
      </Rise>
      <Rise delay={110}>
        <Txt size={15} color={c.textMuted} style={{ marginBottom: 10 }}>
          What's on your mind?
        </Txt>
      </Rise>
      <View style={styles.chips}>
        {SUGGESTIONS.map((s, i) => (
          <Rise key={s.text} delay={170 + i * 65}>
            <Pressable
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
          </Rise>
        ))}
      </View>
    </View>
  )
}

/** Staggered entrance: each element fades in and rises with its own delay. */
function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(12)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start()
  }, [opacity, y, delay])
  return <Animated.View style={{ opacity, transform: [{ translateY: y }], width: '100%', alignItems: 'center' }}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 8 },
  mark: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  chips: { width: '100%', gap: 10, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderWidth: 1 },
})
