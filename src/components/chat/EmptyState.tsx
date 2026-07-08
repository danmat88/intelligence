import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import { useChat } from '../../chat/store'
import BrandGradient from '../ui/BrandGradient'
import Txt from '../ui/Txt'

/** Time-of-day greeting, personalized with the user's first name. */
function greeting(name?: string | null): string {
  const h = new Date().getHours()
  const base = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const first = name?.trim().split(/\s+/)[0]
  return first ? `${base}, ${first}` : base
}

const ACTIONS: { icon: keyof typeof Feather.glyphMap; title: string; sub: string; prompt: string }[] = [
  {
    icon: 'zap',
    title: 'Learn',
    sub: 'Something fascinating',
    prompt: 'Teach me something genuinely fascinating that most people don’t know. Go deep.',
  },
  {
    icon: 'feather',
    title: 'Write',
    sub: 'Draft anything',
    prompt: 'Help me write something. Start by asking me three sharp questions about what I need.',
  },
  {
    icon: 'code',
    title: 'Build',
    sub: 'Code & debug',
    prompt: 'Act as my senior engineer. Ask me what I’m building, then help me design it properly.',
  },
  {
    icon: 'compass',
    title: 'Explore',
    sub: 'Wild ideas',
    prompt: 'Brainstorm 10 bold, unconventional ideas at the frontier of technology. Number them.',
  },
]

/**
 * The Home experience: brand orb, greeting, action cards, recent chats.
 * Scrollable, so with the keyboard open it compresses instead of overflowing
 * into the header. Entrance animation plays once on arrival; nothing loops.
 */
export default function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { user } = useAuth()
  const { conversations, selectChat } = useChat()
  const recent = conversations.slice(0, 3)

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.wrap}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Rise delay={0}>
        <View style={styles.orbBox}>
          <View style={[styles.orbRing, { borderColor: c.accent + '33' }]} />
          <BrandGradient style={styles.orbCore}>
            <Ionicons name="sparkles" size={34} color={c.onAccent} />
          </BrandGradient>
        </View>
      </Rise>
      <Rise delay={60}>
        <Txt size={28} style={{ letterSpacing: -0.6, fontFamily: theme.font.display, textAlign: 'center' }}>
          {greeting(user?.name)}
        </Txt>
      </Rise>
      <Rise delay={100}>
        <Txt size={15} color={c.textMuted} style={{ marginBottom: 14 }}>
          What should we make today?
        </Txt>
      </Rise>

      <View style={styles.grid}>
        {ACTIONS.map((a, i) => (
          <Rise key={a.title} delay={140 + i * 45} style={styles.cell}>
            <Pressable
              onPress={() => onPick(a.prompt)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  borderRadius: theme.radius.lg,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <BrandGradient style={styles.cardIcon}>
                <Feather name={a.icon} size={15} color={c.onAccent} />
              </BrandGradient>
              <Txt weight="semibold" size={15.5}>
                {a.title}
              </Txt>
              <Txt size={12.5} color={c.textFaint}>
                {a.sub}
              </Txt>
            </Pressable>
          </Rise>
        ))}
      </View>

      {recent.length > 0 && (
        <Rise delay={340} style={{ width: '100%' }}>
          <Txt size={12.5} weight="semibold" color={c.textFaint} style={styles.recentLabel}>
            CONTINUE
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recent.map((conv) => (
              <Pressable
                key={conv.id}
                onPress={() => {
                  Keyboard.dismiss() // navigating away from writing
                  selectChat(conv.id)
                }}
                style={({ pressed }) => [
                  styles.recentPill,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderRadius: theme.radius.pill,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="message-circle" size={13} color={c.accent} />
                <Txt numberOfLines={1} size={13.5} color={c.textMuted} style={{ maxWidth: 160 }}>
                  {conv.title}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </Rise>
      )}
    </ScrollView>
  )
}

/** One-shot entrance on arrival (user-caused); never loops. */
function Rise({ delay, children, style }: { delay: number; children: ReactNode; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(12)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start()
  }, [opacity, y, delay])
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: y }], alignItems: 'center' }, style]}>
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 16, gap: 8 },
  orbBox: { width: 116, height: 116, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  orbRing: { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 1.5 },
  orbCore: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  cell: { width: '47%' },
  card: { width: '100%', borderWidth: 1, padding: 14, gap: 3 },
  cardIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  recentLabel: { letterSpacing: 1.2, marginTop: 18, marginBottom: 8, paddingHorizontal: 6 },
  recentRow: { gap: 8, paddingHorizontal: 4 },
  recentPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
})
