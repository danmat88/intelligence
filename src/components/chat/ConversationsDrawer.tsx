import { useEffect, useRef } from 'react'
import { Alert, Animated, Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import { useChat } from '../../chat/store'
import Txt from '../ui/Txt'

const PANEL_W = Math.min(340, Dimensions.get('window').width * 0.84)

/** Slide-in sidebar of conversations, like Claude's chat history. */
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
  const { conversations, current, newChat, selectChat, deleteChat } = useChat()
  const { user } = useAuth()

  const p = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(p, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true }).start()
  }, [open, p])

  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [-PANEL_W - 20, 0] })
  const backdrop = p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] })

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
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 12,
            backgroundColor: c.bgElevated,
            borderColor: c.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.head}>
          <Txt weight="extrabold" size={20} style={{ letterSpacing: -0.3 }}>
            Chats
          </Txt>
          <Pressable
            onPress={() => { newChat(); onClose() }}
            style={({ pressed }) => [
              styles.newBtn,
              { backgroundColor: c.surfaceAlt, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color={c.text} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingTop: 10 }}>
          {conversations.map((conv) => {
            const active = conv.id === current.id
            return (
              <Pressable
                key={conv.id}
                onPress={() => { selectChat(conv.id); onClose() }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: active ? c.surfaceAlt : 'transparent',
                    borderRadius: theme.radius.md,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="message-circle" size={16} color={active ? c.accent : c.textFaint} />
                <Txt
                  numberOfLines={1}
                  weight={active ? 'semibold' : 'regular'}
                  size={15}
                  color={active ? c.text : c.textMuted}
                  style={{ flex: 1 }}
                >
                  {conv.title || 'New chat'}
                </Txt>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Delete chat?', `"${conv.title || 'New chat'}" will be gone forever.`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteChat(conv.id) },
                    ])
                  }
                >
                  <Feather name="trash-2" size={15} color={c.textFaint} />
                </Pressable>
              </Pressable>
            )
          })}
        </ScrollView>

        {user && (
          <Pressable
            onPress={() => { onClose(); onOpenSettings() }}
            style={({ pressed }) => [styles.account, { borderTopColor: c.border, opacity: pressed ? 0.7 : 1 }]}
          >
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.surfaceAlt }]}>
                <Feather name="user" size={18} color={c.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Txt numberOfLines={1} weight="semibold" size={14}>
                {user.name ?? user.email}
              </Txt>
              <Txt numberOfLines={1} size={12} color={c.textFaint}>
                {user.email}
              </Txt>
            </View>
            <Feather name="settings" size={17} color={c.textFaint} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRightWidth: 1, paddingHorizontal: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  newBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 13, gap: 12 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 10,
    paddingHorizontal: 6,
  },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
})
