import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import { useChat } from '../../chat/store'
import BrandGradient from '../ui/BrandGradient'
import Starfield from '../ui/Starfield'
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

/** The Home experience: living orb, greeting, action cards, recent chats. */
export default function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { user } = useAuth()
  const { conversations, selectChat } = useChat()
  const recent = conversations.slice(0, 3)

  return (
    <View style={styles.wrap}>
      <Starfield count={14} />

      <Rise delay={0}>
        <Orb />
      </Rise>
      <Rise delay={80}>
        <Txt size={28} style={{ letterSpacing: -0.6, fontFamily: theme.font.display, textAlign: 'center' }}>
          {greeting(user?.name)}
        </Txt>
      </Rise>
      <Rise delay={130}>
        <Txt size={15} color={c.textMuted} style={{ marginBottom: 14 }}>
          What should we make today?
        </Txt>
      </Rise>

      <View style={styles.grid}>
        {ACTIONS.map((a, i) => (
          <Rise key={a.title} delay={190 + i * 60} style={styles.cell}>
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
        <Rise delay={470} style={{ width: '100%' }}>
          <Txt size={12.5} weight="semibold" color={c.textFaint} style={styles.recentLabel}>
            CONTINUE
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recent.map((conv) => (
              <Pressable
                key={conv.id}
                onPress={() => selectChat(conv.id)}
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
    </View>
  )
}

/**
 * The centerpiece: a layered orb - revolving gradient halo around a breathing
 * core with a hot center. Reads as "the intelligence lives here".
 */
function Orb() {
  const pulse = useRef(new Animated.Value(0)).current
  const { theme } = useTheme()

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View style={styles.orbBox}>
      {/* sonar halo: two rings expanding and dissolving, offset in phase */}
      <SonarRing color={theme.colors.accent} delay={0} />
      <SonarRing color={theme.gradient.brand[2]} delay={1100} />
      {/* core: breathing gradient sphere with a hot center */}
      <Animated.View
        style={{
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }],
        }}
      >
        <BrandGradient style={styles.orbCore}>
          <View style={styles.orbHot} />
        </BrandGradient>
      </Animated.View>
    </View>
  )
}

/** A circle outline that grows from the core and fades - clean on every GPU. */
function SonarRing({ color, delay }: { color: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [v, delay])
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orbRing,
        {
          borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.35] }) }],
        },
      ]}
    />
  )
}

/** Staggered entrance: each element fades in and rises with its own delay. */
function Rise({ delay, children, style }: { delay: number; children: ReactNode; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(12)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start()
  }, [opacity, y, delay])
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: y }], alignItems: 'center' }, style]}>
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 8 },
  orbBox: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  orbRing: { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 1.5 },
  orbCore: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  orbHot: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.85)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, width: '100%' },
  cell: { width: '47%' },
  card: { width: '100%', borderWidth: 1, padding: 14, gap: 3 },
  cardIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  recentLabel: { letterSpacing: 1.2, marginTop: 18, marginBottom: 8, paddingHorizontal: 6 },
  recentRow: { gap: 8, paddingHorizontal: 4 },
  recentPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
})
