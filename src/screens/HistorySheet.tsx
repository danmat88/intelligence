import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/AuthProvider'
import Overlay from '../components/ui/Overlay'
import Txt from '../components/ui/Txt'
import { subscribeProblems, removeProblem, type Problem } from '../solve/store'

function ago(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}d`
  return new Date(ms).toLocaleDateString()
}

/** Consecutive days (ending today or yesterday) with at least one solve. */
function computeStreak(items: Problem[]): number {
  if (!items.length) return 0
  const days = new Set(items.map((p) => new Date(p.createdAt).toDateString()))
  const d = new Date()
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  let streak = 0
  while (days.has(d.toDateString())) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** "Your work" — saved problems + a streak and a topic skill-map, as a bottom sheet. */
export default function HistorySheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (p: Problem) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [items, setItems] = useState<Problem[]>([])
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user) return
    return subscribeProblems(user.id, setItems)
  }, [open, user])

  const streak = useMemo(() => computeStreak(items), [items])
  const topics = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of items) if (p.topic) m.set(p.topic, (m.get(p.topic) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [items])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((p) => {
      if (topicFilter && p.topic !== topicFilter) return false
      if (q) return p.title.toLowerCase().includes(q) || (p.topic ?? '').toLowerCase().includes(q)
      return true
    })
  }, [items, query, topicFilter])

  const mono = { fontFamily: theme.font.mono }

  return (
    <Overlay open={open} onClose={onClose} align="bottom">
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={styles.grab} />
        <View style={styles.head}>
          <Txt style={[styles.title, { fontFamily: theme.font.serif, color: c.text }]}>Your work</Txt>
          <Txt size={11} color={c.textFaint} style={mono}>
            {items.length} SOLVED{streak > 0 ? `  ·  ${streak}D STREAK` : ''}
          </Txt>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={26} color={c.textFaint} />
            <Txt size={14} color={c.textMuted} style={styles.emptyTxt}>
              Nothing yet — solve a problem and it lands here.
            </Txt>
          </View>
        ) : (
          <>
            {/* search */}
            <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Feather name="search" size={16} color={c.textFaint} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search your work…"
                placeholderTextColor={c.textFaint}
                value={query}
                onChangeText={setQuery}
                maxFontSizeMultiplier={1.2}
              />
              {!!query && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Feather name="x" size={16} color={c.textFaint} />
                </Pressable>
              )}
            </View>

            {/* skill map — tap a topic to filter */}
            {topics.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}
              >
                <TopicChip label="All" active={!topicFilter} c={c} mono={mono} onPress={() => setTopicFilter(null)} />
                {topics.map(([t, n]) => (
                  <TopicChip
                    key={t}
                    label={`${t} · ${n}`}
                    active={topicFilter === t}
                    c={c}
                    mono={mono}
                    onPress={() => setTopicFilter(topicFilter === t ? null : t)}
                  />
                ))}
              </ScrollView>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(p) => p.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listPad}
              ListEmptyComponent={
                <Txt size={13} color={c.textFaint} style={styles.noMatch}>
                  No matches.
                </Txt>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item)
                    onClose()
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={styles.flex}>
                    <Txt weight="semibold" size={14.5} numberOfLines={1} color={c.text}>
                      {item.title}
                    </Txt>
                    <View style={styles.meta}>
                      {!!item.topic && (
                        <Txt size={11} weight="semibold" color={c.accent} style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                          {item.topic}
                        </Txt>
                      )}
                      <Txt size={11} color={c.textFaint} style={mono}>
                        {ago(item.createdAt)}
                      </Txt>
                    </View>
                  </View>
                  <Pressable onPress={() => user && removeProblem(user.id, item.id)} hitSlop={10} style={styles.del}>
                    <Feather name="trash-2" size={16} color={c.textFaint} />
                  </Pressable>
                </Pressable>
              )}
            />
          </>
        )}
      </View>
    </Overlay>
  )
}

function TopicChip({
  label,
  active,
  c,
  mono,
  onPress,
}: {
  label: string
  active: boolean
  c: { accent: string; accentSoft: string; surface: string; border: string; textMuted: string; onAccent: string }
  mono: { fontFamily: string }
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? c.accent : c.surface,
          borderColor: active ? c.accent : c.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Txt size={12} weight="semibold" color={active ? c.onAccent : c.textMuted} style={mono}>
        {label}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '86%',
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(20,25,34,0.14)', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  title: { fontSize: 23 },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  emptyTxt: { marginTop: 10, textAlign: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14.5, fontFamily: 'Inter_400Regular', padding: 0 },
  chips: { gap: 7, paddingBottom: 12, paddingRight: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  listPad: { paddingBottom: 8 },
  noMatch: { textAlign: 'center', paddingVertical: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  del: { padding: 4 },
})
