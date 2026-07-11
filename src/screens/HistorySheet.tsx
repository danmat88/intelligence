import { useEffect, useMemo, useState } from 'react'
import { Keyboard, Pressable, ScrollView, SectionList, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import Overlay from '../components/ui/Overlay'
import Press from '../components/ui/Press'
import Txt from '../components/ui/Txt'
import { subscribeProblems, removeProblem, type Problem } from '../solve/store'

function ago(ms: number, justNow: string, daySuffix: string): string {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return justNow
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}${daySuffix}`
  return new Date(ms).toLocaleDateString()
}

/** Live keyboard height, so the sheet can rise above it (Android events). */
function useKeyboardHeight(): number {
  const [h, setH] = useState(0)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setH(e.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardDidHide', () => setH(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return h
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

/** Legacy docs stored the photo label with a leading camera emoji — strip it. */
function cleanTitle(title: string): string {
  return title.replace(/^\s*📷\s*/, '')
}

/** Photo problems get a camera tile; typed ones a pencil tile. */
function isPhotoProblem(p: Problem): boolean {
  return /📷/.test(p.title) || /^(Photo problem|Problemă din poză)$/.test(cleanTitle(p.title))
}

type DayBucket = 'today' | 'yesterday' | 'week' | 'earlier'

function bucketOf(ms: number): DayBucket {
  const now = new Date()
  const d = new Date(ms)
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return 'week'
  return 'earlier'
}

/**
 * "Your work" — a bottom sheet with real structure: stat tiles (solved count +
 * streak), search, a topic skill-map, and the problems grouped by day
 * (Today / Yesterday / This week / Earlier). Each problem is a card with an
 * icon tile telling photo from typed at a glance. No emoji anywhere — icons do
 * the talking.
 */
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
  const { height: winH } = useWindowDimensions()
  const kb = useKeyboardHeight()
  const { user } = useAuth()
  const { t, lang } = useI18n()
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
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = items.filter((p) => {
      if (topicFilter && p.topic !== topicFilter) return false
      if (q) return cleanTitle(p.title).toLowerCase().includes(q) || (p.topic ?? '').toLowerCase().includes(q)
      return true
    })
    const order: DayBucket[] = ['today', 'yesterday', 'week', 'earlier']
    const byBucket = new Map<DayBucket, Problem[]>()
    for (const p of filtered) {
      const b = bucketOf(p.createdAt)
      byBucket.set(b, [...(byBucket.get(b) ?? []), p])
    }
    return order
      .filter((b) => byBucket.has(b))
      .map((b) => ({ key: b, title: t(`history.section.${b}` as const), data: byBucket.get(b)! }))
  }, [items, query, topicFilter, t])

  const mono = { fontFamily: theme.font.mono }

  return (
    <Overlay open={open} onClose={onClose} align="bottom">
      <View
        style={[
          styles.sheet,
          // pixel maxHeight — a percentage here resolves against an
          // undefined-height absolute parent and un-anchors the sheet.
          // While the search keyboard is up, the whole sheet rises above it
          // and shrinks to the space that remains — the list stays reachable.
          {
            backgroundColor: c.bgElevated,
            borderColor: c.border,
            paddingBottom: insets.bottom + 12,
            marginBottom: Math.max(0, kb - insets.bottom),
            maxHeight: Math.min(winH * 0.88, winH - kb - insets.top - 16),
          },
        ]}
      >
        <View style={[styles.grab, { backgroundColor: c.border }]} />
        <View style={styles.head}>
          <Txt style={[styles.title, { fontFamily: theme.font.display, color: c.text }]}>{t('history.title')}</Txt>
          <Press onPress={onClose} hitSlop={8} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={t('a11y.close')} style={[styles.closeBtn, { backgroundColor: c.surfaceAlt }]}>
            <Feather name="x" size={17} color={c.textMuted} />
          </Press>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: c.accentSoft }]}>
              <Feather name="inbox" size={24} color={c.accent} />
            </View>
            <Txt size={14} color={c.textMuted} style={styles.emptyTxt}>
              {t('history.empty')}
            </Txt>
          </View>
        ) : (
          <>
            {/* stats — drawn as real tiles, not a line of mono text */}
            <View style={styles.stats}>
              <StatTile
                icon="check-circle"
                value={String(items.length)}
                label={t('history.stat.solved')}
                c={c}
                displayFont={theme.font.display}
              />
              {streak > 0 && (
                <StatTile
                  icon="zap"
                  value={String(streak)}
                  label={streak === 1 ? t('history.stat.streak.one') : t('history.stat.streak')}
                  c={c}
                  displayFont={theme.font.display}
                />
              )}
            </View>

            {/* search */}
            <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Feather name="search" size={16} color={c.textFaint} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder={t('history.search')}
                placeholderTextColor={c.textFaint}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
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
                // flexShrink:0 — without it the sheet's maxHeight squeezes this
                // row vertically and clips the chip text
                style={styles.chipsBar}
                contentContainerStyle={styles.chips}
              >
                <TopicChip label={t('history.all')} active={!topicFilter} c={c} onPress={() => setTopicFilter(null)} />
                {topics.map(([topic, n]) => (
                  <TopicChip
                    key={topic}
                    label={`${topic} · ${n}`}
                    active={topicFilter === topic}
                    c={c}
                    onPress={() => setTopicFilter(topicFilter === topic ? null : topic)}
                  />
                ))}
              </ScrollView>
            )}

            <SectionList
              sections={sections}
              keyExtractor={(p) => p.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.listPad}
              ListEmptyComponent={
                <Txt size={13} color={c.textFaint} style={styles.noMatch}>
                  {t('history.noMatch')}
                </Txt>
              }
              renderSectionHeader={({ section }) => (
                <Txt size={10.5} color={c.textFaint} style={[styles.sectionLabel, mono]}>
                  {section.title.toUpperCase()}
                </Txt>
              )}
              renderItem={({ item }) => (
                <Press
                  onPress={() => {
                    onSelect(item)
                    onClose()
                  }}
                  scaleTo={0.975}
                  style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
                >
                  <View style={[styles.cardIcon, { backgroundColor: c.accentSoft }]}>
                    <Feather name={isPhotoProblem(item) ? 'camera' : 'edit-3'} size={16} color={c.accent} />
                  </View>
                  <View style={styles.flex}>
                    <Txt weight="semibold" size={14.5} numberOfLines={1} color={c.text}>
                      {cleanTitle(item.title)}
                    </Txt>
                    <View style={styles.meta}>
                      {!!item.topic && (
                        <Txt size={11} weight="semibold" color={c.accent} style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                          {item.topic}
                        </Txt>
                      )}
                      <Txt size={11} color={c.textFaint} style={mono}>
                        {ago(item.createdAt, t('history.justNow'), lang === 'ro' ? 'z' : 'd')}
                      </Txt>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => user && removeProblem(user.id, item.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t('a11y.delete')}
                    style={({ pressed }) => [styles.del, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <Feather name="trash-2" size={16} color={c.textFaint} />
                  </Pressable>
                </Press>
              )}
            />
          </>
        )}
      </View>
    </Overlay>
  )
}

function StatTile({
  icon,
  value,
  label,
  c,
  displayFont,
}: {
  icon: keyof typeof Feather.glyphMap
  value: string
  label: string
  c: { surface: string; border: string; accent: string; accentSoft: string; text: string; textFaint: string }
  displayFont: string
}) {
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.statIcon, { backgroundColor: c.accentSoft }]}>
        <Feather name={icon} size={15} color={c.accent} />
      </View>
      <View>
        <Txt style={{ fontFamily: displayFont, fontSize: 17, color: c.text, lineHeight: 20 }}>{value}</Txt>
        <Txt size={11} color={c.textFaint}>
          {label}
        </Txt>
      </View>
    </View>
  )
}

function TopicChip({
  label,
  active,
  c,
  onPress,
}: {
  label: string
  active: boolean
  c: { accent: string; accentSoft: string; surface: string; border: string; textMuted: string; onAccent: string }
  onPress: () => void
}) {
  return (
    <Press
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c.accent : c.surface,
          borderColor: active ? c.accent : c.border,
        },
      ]}
    >
      {/* Inter, not mono — the mono face clips vertically inside chips on Android */}
      <Txt size={12} weight="semibold" color={active ? c.onAccent : c.textMuted} style={styles.chipTxt}>
        {label}
      </Txt>
    </Press>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  title: { fontSize: 22, letterSpacing: -0.4 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  emptyBadge: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { marginTop: 12, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
  chipsBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 7, paddingBottom: 12, paddingRight: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  chipTxt: { lineHeight: 16, includeFontPadding: false },
  listPad: { paddingBottom: 8 },
  sectionLabel: { letterSpacing: 1.1, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  noMatch: { textAlign: 'center', paddingVertical: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 16, padding: 13, marginBottom: 9 },
  cardIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  del: { padding: 4 },
})
