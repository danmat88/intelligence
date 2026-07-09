import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
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

/** "Your work" — the saved-problems history, as a bottom sheet. */
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

  useEffect(() => {
    if (!open || !user) return
    return subscribeProblems(user.id, setItems)
  }, [open, user])

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
          <Txt size={11} color={c.textFaint} style={{ fontFamily: theme.font.mono }}>
            {items.length} SOLVED
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
          <FlatList
            data={items}
            keyExtractor={(p) => p.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listPad}
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
                    <Txt size={11} color={c.textFaint} style={{ fontFamily: theme.font.mono }}>
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
        )}
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '82%',
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(20,25,34,0.14)', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  title: { fontSize: 23 },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  emptyTxt: { marginTop: 10, textAlign: 'center' },
  listPad: { paddingBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  del: { padding: 4 },
})
