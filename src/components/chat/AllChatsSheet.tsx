import { useEffect, useState } from 'react'
import { Dimensions, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useChat, type Conversation } from '../../chat/store'
import ChatMenu, { type ChatMenuTarget } from './ChatMenu'
import Overlay from '../ui/Overlay'
import Txt from '../ui/Txt'

/** Compact relative time: now, 5m, 3h, 2d, then a short date. */
function timeAgo(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * The full chat library: search, starred first, everything manageable -
 * tap to open, hold for rename/star/delete.
 */
export default function AllChatsSheet({
  open,
  onClose,
  onPicked,
}: {
  open: boolean
  onClose: () => void
  onPicked: (id: string) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { conversations } = useChat()
  const [query, setQuery] = useState('')
  const [menuTarget, setMenuTarget] = useState<ChatMenuTarget | null>(null)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const q = query.trim().toLowerCase()
  const matches = q ? conversations.filter((conv) => conv.title.toLowerCase().includes(q)) : conversations
  const starred = matches.filter((conv) => conv.starred)
  const rest = matches.filter((conv) => !conv.starred)

  const Row = ({ conv }: { conv: Conversation }) => (
    <Pressable
      onPress={() => onPicked(conv.id)}
      onLongPress={() => setMenuTarget({ id: conv.id, title: conv.title || 'New chat', starred: conv.starred })}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        { borderRadius: theme.radius.sm, backgroundColor: pressed ? c.surfaceAlt : 'transparent' },
      ]}
    >
      {conv.starred && <Feather name="star" size={12} color={c.accent} />}
      <Txt numberOfLines={1} size={14.5} color={c.text} style={{ flex: 1 }}>
        {conv.title || 'New chat'}
      </Txt>
      <Txt size={11.5} color={c.textFaint}>
        {timeAgo(conv.updatedAt)}
      </Txt>
    </Pressable>
  )

  return (
    <>
      <Overlay open={open} onClose={onClose} align="bottom">
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.bgElevated,
              borderColor: c.border,
              height: Dimensions.get('window').height * 0.86,
              paddingBottom: insets.bottom + 10,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Txt size={18} style={{ fontFamily: theme.font.display, paddingHorizontal: 8, marginBottom: 10 }}>
            Chats
          </Txt>

          <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius.md }]}>
            <Feather name="search" size={15} color={c.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search chats"
              placeholderTextColor={c.textFaint}
              style={[styles.searchInput, { color: c.text, fontFamily: theme.font.regular }]}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x" size={15} color={c.textFaint} />
              </Pressable>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 12 }}
          >
            {matches.length === 0 && (
              <Txt size={13.5} color={c.textFaint} style={{ paddingHorizontal: 10, paddingVertical: 12 }}>
                {q ? 'No chats match your search.' : 'No conversations yet.'}
              </Txt>
            )}
            {starred.length > 0 && (
              <>
                <Txt size={11.5} weight="semibold" color={c.textFaint} style={styles.groupLabel}>
                  STARRED
                </Txt>
                {starred.map((conv) => (
                  <Row key={conv.id} conv={conv} />
                ))}
              </>
            )}
            {rest.length > 0 && (
              <>
                <Txt size={11.5} weight="semibold" color={c.textFaint} style={[styles.groupLabel, starred.length > 0 && { marginTop: 14 }]}>
                  ALL CHATS
                </Txt>
                {rest.map((conv) => (
                  <Row key={conv.id} conv={conv} />
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Overlay>

      <ChatMenu target={menuTarget} onClose={() => setMenuTarget(null)} />
    </>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 9 },
  groupLabel: { paddingHorizontal: 10, marginBottom: 4, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 12 },
})
