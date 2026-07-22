import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native'
import RAnimated, { Easing as REasing, LinearTransition, SlideOutLeft } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import Overlay from '../components/ui/Overlay'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'
import { subscribeProblems, removeProblem, writeProblem, type Problem } from '../solve/store'
import { deleteProblemImages } from '../solve/imageStore'
import { reportNonFatal } from '../lib/report'

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

/** Photo problems get a camera tile; typed ones a pencil tile. New docs carry
 *  a real `photo` flag; the title heuristic only covers legacy docs. */
function isPhotoProblem(p: Problem): boolean {
  if (typeof p.photo === 'boolean') return p.photo
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

/** The list flattened for one FlatList: day headers between problem rows. */
type Row = { kind: 'header'; key: string; title: string } | { kind: 'item'; key: string; p: Problem }

const ROW_EXIT = SlideOutLeft.duration(280).easing(REasing.in(REasing.cubic))
const ROW_SHIFT = LinearTransition.duration(320).easing(REasing.bezier(0.22, 1, 0.36, 1))

/**
 * "Your work" — a FIXED-HEIGHT bottom sheet (the panel never grows or shrinks
 * as data arrives; content changes inside it): stat tiles, search, a topic
 * skill-map, and problems grouped by day. While loading, a ghost layout
 * mirrors the real one so data lights up IN PLACE. Deleting slides the row
 * out (siblings glide up on the UI thread) with an Undo toast — no confirm
 * dialogs, no accidents. No emoji anywhere — icons do the talking.
 */
export default function HistorySheet({
  open,
  onClose,
  onSelect,
  onDeleted,
}: {
  open: boolean
  onClose: () => void
  onSelect: (p: Problem) => void
  /** Fired on delete so the solver can unlink an open problem's stale id. */
  onDeleted?: (id: string) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { height: winH } = useWindowDimensions()
  const kb = useKeyboardHeight()
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const toast = useToast()
  const [items, setItems] = useState<Problem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [settled, setSettled] = useState(false)
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState<string | null>(null)

  // Sequenced flow: let the sheet LAND first (500ms slide), only then attach
  // the Firestore listener and mount the list — heavy work never rides along
  // with the entrance animation. Items stay cached, so reopening is instant.
  useEffect(() => {
    if (!open) {
      setSettled(false)
      return
    }
    const id = setTimeout(() => setSettled(true), 540)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open || !settled || !user) return
    return subscribeProblems(user.id, (xs) => {
      setItems(xs)
      setLoaded(true)
    })
  }, [open, settled, user])

  // Account switch (sign-out → fresh guest) — never show another uid's cache.
  useEffect(() => {
    setItems([])
    setLoaded(false)
  }, [user?.id])

  const streak = useMemo(() => computeStreak(items), [items])
  const topics = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of items) if (p.topic) m.set(p.topic, (m.get(p.topic) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [items])
  const rows = useMemo<Row[]>(() => {
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
    const out: Row[] = []
    for (const b of order) {
      const list = byBucket.get(b)
      if (!list) continue
      out.push({ kind: 'header', key: `h:${b}`, title: t(`history.section.${b}` as const) })
      for (const p of list) out.push({ kind: 'item', key: p.id, p })
    }
    return out
  }, [items, query, topicFilter, t])

  // Delete = optimistic + reversible: the row slides out, an Undo toast
  // brings the problem back with one tap. No confirm dialog friction.
  // The photos are deleted DEFERRED (after the undo window closes) — an
  // undone problem needs its images, an abandoned delete must not leak them.
  const pendingImageDeletes = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const onDelete = useCallback(
    (item: Problem) => {
      if (!user) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      removeProblem(user.id, item.id).catch(() => {})
      onDeleted?.(item.id)
      pendingImageDeletes.current[item.id] = setTimeout(() => {
        delete pendingImageDeletes.current[item.id]
        deleteProblemImages(item.turns.map((x) => x.imagePath))
      }, 6000) // just past the 5s actionable-toast window
      toast.show(t('history.deleted'), 'trash-2', {
        label: t('history.undo'),
        onPress: () => {
          const timer = pendingImageDeletes.current[item.id]
          if (timer) clearTimeout(timer)
          delete pendingImageDeletes.current[item.id]
          // Restored, not re-created: SAME id, original date, original
          // photo-ness — undo genuinely puts the document back.
          writeProblem(
            user.id,
            item.id,
            { title: cleanTitle(item.title), topic: item.topic, turns: item.turns, photo: isPhotoProblem(item) },
            item.createdAt,
          ).catch((e) => reportNonFatal(e, 'undo-restore'))
        },
      })
    },
    [user, toast, t, onDeleted],
  )

  const mono = { fontFamily: theme.font.mono }
  // The panel's ONE height: stable no matter what the content is doing.
  // Only the keyboard (search) legitimately reshapes it.
  const sheetH = Math.min(winH * 0.86, winH - kb - insets.top - 16)
  const hasContent = loaded && items.length > 0

  return (
    <Overlay open={open} onClose={onClose} align="bottom">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: c.bgElevated,
            borderColor: c.border,
            paddingBottom: insets.bottom + 12,
            marginBottom: Math.max(0, kb - insets.bottom),
            height: sheetH,
          },
        ]}
      >
        <View style={[styles.grab, { backgroundColor: c.border }]} />
        <View style={styles.head}>
          <Txt style={[styles.title, { fontFamily: theme.font.display, color: c.text }]}>{t('history.title')}</Txt>
          <Press onPress={onClose} hitSlop={8} scaleTo={0.88} accessibilityRole="button" accessibilityLabel={t('a11y.close')} style={[styles.closeBtn, { backgroundColor: c.surfaceAlt }]}>
            <RezIcon name="close" size={17} color={c.textMuted} accent={c.accent} />
          </Press>
        </View>

        {loaded && items.length === 0 ? (
          // Brand-new account: the panel keeps its size; the message owns it.
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: c.accentSoft }]}>
              <RezIcon name="history" size={25} color={c.accent} accent={c.accent} />
            </View>
            <Txt size={14} color={c.textMuted} style={styles.emptyTxt}>
              {t('history.empty')}
            </Txt>
          </View>
        ) : (
          <>
            {/* stats — ghost values until the first snapshot lands */}
            <View style={styles.stats}>
              <StatTile
                icon="check"
                value={loaded ? String(items.length) : null}
                label={t('history.stat.solved')}
                c={c}
                displayFont={theme.font.display}
              />
              {(!loaded || streak > 0) && (
                <StatTile
                  icon="premium"
                  value={loaded ? String(streak) : null}
                  label={streak === 1 ? t('history.stat.streak.one') : t('history.stat.streak')}
                  c={c}
                  displayFont={theme.font.display}
                />
              )}
            </View>

            {/* search — a ghost twin while loading, so nothing jumps */}
            {loaded ? (
              <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
                <RezIcon name="search" size={17} color={c.textFaint} accent={c.accent} />
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
                    <RezIcon name="close" size={16} color={c.textFaint} accent={c.accent} />
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
                <RezIcon name="search" size={17} color={c.textFaint} accent={c.accent} />
                <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: 132 }]} />
              </View>
            )}

            {/* skill map — tap a topic to filter */}
            {hasContent && topics.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                // flexShrink:0 — without it the sheet's height squeezes this
                // row vertically and clips the chip text
                style={styles.chipsBar}
                contentContainerStyle={styles.chips}
              >
                <TopicChip label={`${t('history.all')} · ${items.length}`} active={!topicFilter} c={c} onPress={() => setTopicFilter(null)} />
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

            {!loaded ? (
              <View style={styles.flex}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[styles.cardIcon, { backgroundColor: c.surfaceAlt }]} />
                    <View style={styles.flex}>
                      <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: '72%' }]} />
                      <View style={[styles.ghostBar, styles.ghostBarSm, { backgroundColor: c.surfaceAlt, width: '38%' }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <RAnimated.FlatList
                data={rows}
                keyExtractor={(r: Row) => r.key}
                itemLayoutAnimation={ROW_SHIFT}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={styles.flex}
                contentContainerStyle={styles.listPad}
                ListEmptyComponent={
                  <Txt size={13} color={c.textFaint} style={styles.noMatch}>
                    {t('history.noMatch')}
                  </Txt>
                }
                renderItem={({ item }: { item: Row }) =>
                  item.kind === 'header' ? (
                    <RAnimated.View layout={ROW_SHIFT}>
                      <Txt size={10.5} color={c.textFaint} style={[styles.sectionLabel, mono]}>
                        {item.title.toUpperCase()}
                      </Txt>
                    </RAnimated.View>
                  ) : (
                    <RAnimated.View layout={ROW_SHIFT} exiting={ROW_EXIT}>
                      <Press
                        onPress={() => {
                          onSelect(item.p)
                          onClose()
                        }}
                        scaleTo={0.975}
                        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
                      >
                        <View style={[styles.cardIcon, { backgroundColor: c.accentSoft }]}>
                          <RezIcon name={isPhotoProblem(item.p) ? 'camera' : 'write'} size={17} color={c.accent} accent={c.accent} />
                        </View>
                        <View style={styles.flex}>
                          <Txt weight="semibold" size={14.5} numberOfLines={1} color={c.text}>
                            {cleanTitle(item.p.title)}
                          </Txt>
                          <View style={styles.meta}>
                            {!!item.p.topic && (
                              <Txt size={11} weight="semibold" color={c.accent} style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                                {item.p.topic}
                              </Txt>
                            )}
                            <Txt size={11} color={c.textFaint} style={mono}>
                              {ago(item.p.createdAt, t('history.justNow'), lang === 'ro' ? 'z' : 'd')}
                            </Txt>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => onDelete(item.p)}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={t('a11y.delete')}
                          style={({ pressed }) => [styles.del, { opacity: pressed ? 0.5 : 1 }]}
                        >
                          <RezIcon name="trash" size={16} color={c.textFaint} accent={c.danger} />
                        </Pressable>
                      </Press>
                    </RAnimated.View>
                  )
                }
              />
            )}
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
  icon: RezIconName
  /** null while loading — renders a ghost bar in the value slot. */
  value: string | null
  label: string
  c: { surface: string; surfaceAlt: string; border: string; accent: string; accentSoft: string; text: string; textFaint: string }
  displayFont: string
}) {
  return (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.statIcon, { backgroundColor: c.accentSoft }]}>
        <RezIcon name={icon} size={17} color={c.accent} accent={c.accent} />
      </View>
      <View style={styles.flex}>
        {value == null ? (
          <View style={[styles.ghostBar, { backgroundColor: c.surfaceAlt, width: 34, marginBottom: 5 }]} />
        ) : (
          <Txt style={{ fontFamily: displayFont, fontSize: 17, color: c.text, lineHeight: 20 }}>{value}</Txt>
        )}
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
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 9,
    shadowColor: '#15121F',
    shadowOpacity: 0.22,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  grab: { alignSelf: 'center', width: 34, height: 4, borderRadius: 2, marginBottom: 15 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17, paddingHorizontal: 2 },
  title: { fontSize: 24, letterSpacing: -0.8 },
  closeBtn: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 40 },
  emptyBadge: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { marginTop: 12, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 19,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    minHeight: 42,
  },
  searchInput: { flex: 1, fontSize: 14.5, fontFamily: 'Inter_400Regular', padding: 0 },
  chipsBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 7, paddingBottom: 12, paddingRight: 4 },
  chip: { borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  chipTxt: { lineHeight: 16, includeFontPadding: false },
  listPad: { paddingBottom: 8 },
  sectionLabel: { letterSpacing: 1.1, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  noMatch: { textAlign: 'center', paddingVertical: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 19, padding: 14, marginBottom: 7 },
  cardIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  del: { padding: 4 },
  ghostBar: { height: 13, borderRadius: 7 },
  ghostBarSm: { height: 10, marginTop: 8 },
})
