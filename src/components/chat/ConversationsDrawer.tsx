import { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Image, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import { useChat, type Conversation } from '../../chat/store'
import AllChatsSheet from './AllChatsSheet'
import ChatMenu, { type ChatMenuTarget } from './ChatMenu'
import Txt from '../ui/Txt'

const PANEL_W = Math.min(340, Dimensions.get('window').width * 0.84)

/**
 * Slide-in sidebar: wordmark, an "All chats" library entry, then Starred and
 * Recents sections as plain titles. Hold a chat for rename/star/delete.
 * Account chip at the bottom opens Settings.
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
  const { conversations, current, selectChat } = useChat()
  const { user } = useAuth()
  const [menuTarget, setMenuTarget] = useState<ChatMenuTarget | null>(null)
  const [allOpen, setAllOpen] = useState(false)

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

  const starred = conversations.filter((conv) => conv.starred)
  const recents = conversations.filter((conv) => !conv.starred).slice(0, 12)

  const goTo = (id: string) => {
    Keyboard.dismiss()
    selectChat(id)
    setAllOpen(false)
    onClose()
  }

  const Row = ({ conv }: { conv: Conversation }) => {
    const active = conv.id === current.id
    return (
      <Pressable
        onPress={() => goTo(conv.id)}
        onLongPress={() => setMenuTarget({ id: conv.id, title: conv.title || 'New chat', starred: conv.starred })}
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
          style={{ flex: 1 }}
        >
          {conv.title || 'New chat'}
        </Txt>
      </Pressable>
    )
  }

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

        {/* library entry */}
        <Pressable
          onPress={() => setAllOpen(true)}
          style={({ pressed }) => [
            styles.navRow,
            { backgroundColor: pressed ? c.surfaceAlt : 'transparent', borderRadius: theme.radius.sm },
          ]}
        >
          <Feather name="inbox" size={16} color={c.textMuted} />
          <Txt weight="medium" size={14.5} style={{ flex: 1 }}>
            Chats
          </Txt>
          <Feather name="chevron-right" size={15} color={c.textFaint} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {conversations.length === 0 && (
            <Txt size={13.5} color={c.textFaint} style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
              Your conversations will appear here.
            </Txt>
          )}
          {starred.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Txt size={11.5} weight="semibold" color={c.textFaint} style={styles.groupLabel}>
                STARRED
              </Txt>
              {starred.map((conv) => (
                <Row key={conv.id} conv={conv} />
              ))}
            </View>
          )}
          {recents.length > 0 && (
            <View>
              <Txt size={11.5} weight="semibold" color={c.textFaint} style={styles.groupLabel}>
                RECENTS
              </Txt>
              {recents.map((conv) => (
                <Row key={conv.id} conv={conv} />
              ))}
            </View>
          )}
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

      <AllChatsSheet open={allOpen} onClose={() => setAllOpen(false)} onPicked={goTo} />
      <ChatMenu target={menuTarget} onClose={() => setMenuTarget(null)} />
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
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 8, marginVertical: 6 },
  groupLabel: { paddingHorizontal: 12, marginBottom: 4, letterSpacing: 0.4 },
  row: { paddingHorizontal: 12, paddingVertical: 11 },
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
