import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import { useChat, type Conversation } from '../../chat/store'
import ConfirmDialog from '../ui/ConfirmDialog'
import Txt from '../ui/Txt'

const PANEL_W = Math.min(340, Dimensions.get('window').width * 0.84)

/** Claude-style time buckets for the history list. */
function groupByTime(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const today = dayStart.getTime()
  const yesterday = today - 86400_000
  const week = today - 7 * 86400_000

  const buckets: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ]
  for (const conv of conversations) {
    if (conv.updatedAt >= today) buckets[0].items.push(conv)
    else if (conv.updatedAt >= yesterday) buckets[1].items.push(conv)
    else if (conv.updatedAt >= week) buckets[2].items.push(conv)
    else buckets[3].items.push(conv)
  }
  return buckets.filter((b) => b.items.length > 0)
}

/**
 * Slide-in history drawer, Claude-app discipline: wordmark, chats grouped by
 * time as plain titles, account chip at the bottom. No clutter on rows -
 * hold a chat to delete it.
 */
export default function ConversationsDrawer({
  open,
  onClose,
  onOpenSettings,
}: {
  open: boolean
  onClose: () => void
  onOpenSettings: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { conversations, current, selectChat, deleteChat } = useChat()
  const { user } = useAuth()
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null)

  const p = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (open) {
      Animated.spring(p, { toValue: 1, useNativeDriver: true, damping: 19, stiffness: 210, mass: 0.8 }).start()
    } else {
      Animated.timing(p, { toValue: 0, duration: 180, useNativeDriver: true }).start()
    }
  }, [open, p])

  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [-PANEL_W - 20, 0], extrapolate: 'clamp' })
  const backdrop = p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5], extrapolate: 'clamp' })

  const groups = groupByTime(conversations)

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL_W,
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + 12,
            backgroundColor: c.bgElevated,
            borderColor: c.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <Txt size={19} style={{ fontFamily: theme.font.display, paddingHorizontal: 20, marginBottom: 14 }}>
          Intelligence
        </Txt>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {groups.length === 0 && (
            <Txt size={13.5} color={c.textFaint} style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
              Your conversations will appear here.
            </Txt>
          )}
          {groups.map((group) => (
            <View key={group.label} style={{ marginBottom: 10 }}>
              <Txt size={11.5} weight="semibold" color={c.textFaint} style={styles.groupLabel}>
                {group.label}
              </Txt>
              {group.items.map((conv) => {
                const active = conv.id === current.id
                return (
                  <Pressable
                    key={conv.id}
                    onPress={() => {
                      Keyboard.dismiss()
                      selectChat(conv.id)
                      onClose()
                    }}
                    onLongPress={() => setToDelete({ id: conv.id, title: conv.title || 'New chat' })}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: active ? c.surfaceAlt : 'transparent',
                        borderRadius: theme.radius.sm,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Txt
                      numberOfLines={1}
                      weight={active ? 'medium' : 'regular'}
                      size={14.5}
                      color={active ? c.text : c.textMuted}
                    >
                      {conv.title || 'New chat'}
                    </Txt>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </ScrollView>

        {user && (
          <Pressable
            onPress={() => {
              onClose()
              onOpenSettings()
            }}
            style={({ pressed }) => [styles.account, { borderTopColor: c.border, opacity: pressed ? 0.7 : 1 }]}
          >
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.surfaceAlt }]}>
                <Feather name="user" size={16} color={c.textMuted} />
              </View>
            )}
            <Txt numberOfLines={1} weight="medium" size={14} style={{ flex: 1 }}>
              {user.name ?? user.email}
            </Txt>
            <Feather name="more-horizontal" size={16} color={c.textFaint} />
          </Pressable>
        )}
      </Animated.View>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete chat?"
        message={`"${toDelete?.title ?? ''}" and its messages will be gone forever.`}
        onConfirm={() => toDelete && deleteChat(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
    paddingHorizontal: 10,
  },
  groupLabel: { paddingHorizontal: 10, marginBottom: 4, letterSpacing: 0.4, textTransform: 'uppercase' },
  row: { paddingHorizontal: 10, paddingVertical: 11 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
})
