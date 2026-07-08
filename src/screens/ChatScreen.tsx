import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, FlatList, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { NEW_CHAT, useChat } from '../chat/store'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'
import Message from '../components/chat/Message'
import Composer from '../components/chat/Composer'
import UpdateBanner from '../components/ui/UpdateBanner'
import EmptyState from '../components/chat/EmptyState'
import ConversationsDrawer from '../components/chat/ConversationsDrawer'
import ModelSheet from '../components/chat/ModelSheet'
import ChatMenu, { type ChatMenuTarget } from '../components/chat/ChatMenu'
import { Appear, FadeSwitch } from '../components/ui/Transitions'
import ReplyActions from '../components/chat/ReplyActions'
import SettingsModal from './SettingsModal'
import { MODELS } from '../chat/store'

/**
 * The whole chat experience. Keyboard handling is delegated entirely to
 * react-native-keyboard-controller: KeyboardProvider (in App.tsx) takes over the
 * IME insets natively, disabling the OS resize emulation that broke after
 * minimize/restore on Android edge-to-edge (SDK 54+). The KeyboardAvoidingView
 * below is then the single source of lift, animated frame-by-frame with the
 * keyboard in every lifecycle state - including returning from background.
 *
 * The composer already carries `insets.bottom` of padding for the nav bar /
 * home indicator, and the keyboard covers that same area when open - so we
 * offset the avoiding view by -insets.bottom to not double-count it.
 */
export default function ChatScreen() {
  const { theme, mode } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { current, sending, send, stop, regenerate, newChat, loadOlder, model } = useChat()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [menuTarget, setMenuTarget] = useState<ChatMenuTarget | null>(null)
  const [showJump, setShowJump] = useState(false)

  const last = current.messages[current.messages.length - 1]
  const showActions =
    !sending && last?.role === 'assistant' && !last.pending && !last.error && !last.streaming && !!last.text
  const listRef = useRef<FlatList<(typeof current.messages)[number]>>(null)

  // Home shows ONLY for a genuinely new chat - an existing conversation whose
  // messages are still streaming in from the cache renders as a (momentarily
  // blank) thread instead of flashing the Home screen
  const empty = current.id === NEW_CHAT

  // inverted FlatList wants newest-first data; it then pins the newest message
  // to the bottom natively (no manual scroll-to-end on new content needed)
  const newestFirst = useMemo(() => [...current.messages].reverse(), [current.messages])

  const scrollToNewest = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }))
  }, [])

  // the one scroll case the inverted list doesn't cover: keyboard opening
  // while the user had scrolled up - snap back to the newest message
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', scrollToNewest)
    return () => sub.remove()
  }, [scrollToNewest])

  // stale scroll UI must not leak across conversations
  useEffect(() => setShowJump(false), [current.id])

  return (
    <ScreenBackground>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* keyboard doctrine: any move of attention away from writing closes it */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <HeaderButton
          icon="menu"
          color={c.text}
          onPress={() => {
            Keyboard.dismiss()
            setDrawerOpen(true)
          }}
        />
        <View style={styles.flex} />
        <View style={styles.headerRight}>
          <HeaderButton
            icon="edit"
            color={c.text}
            onPress={() => {
              Keyboard.dismiss()
              newChat()
            }}
          />
          {!empty && (
            <HeaderButton
              icon="more-horizontal"
              color={c.text}
              onPress={() => {
                Keyboard.dismiss()
                setMenuTarget({ id: current.id, title: current.title, starred: current.starred })
              }}
            />
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom}
      >
        <View style={styles.column}>
          <FadeSwitch dep={`${current.id}:${empty}`}>
          {empty ? (
            <EmptyState onPick={send} />
          ) : (
            <FlatList
              ref={listRef}
              inverted
              data={newestFirst}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <Message message={item} />}
              style={styles.flex}
              contentContainerStyle={styles.thread}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              // inverted list: "end" = scrolled up to the oldest loaded message
              onEndReached={loadOlder}
              onEndReachedThreshold={0.3}
              onScroll={(e) => setShowJump(e.nativeEvent.contentOffset.y > 420)}
              scrollEventThrottle={120}
              // inverted: the header renders at the visual bottom, under the newest reply
              ListHeaderComponent={
                showActions && last ? <ReplyActions text={last.text} onRegenerate={regenerate} /> : null
              }
            />
          )}
          </FadeSwitch>

          <Appear visible={showJump && !empty} style={[styles.jumpWrap, { bottom: insets.bottom + 96 }]}>
            <Pressable
              onPress={scrollToNewest}
              style={({ pressed }) => [
                styles.jump,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="arrow-down" size={18} color={c.accent} />
            </Pressable>
          </Appear>

          <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 6 }}>
            <UpdateBanner />
            <Composer
              onSend={send}
              onStop={stop}
              sending={sending}
              modelLabel={MODELS[model].short}
              onModelPress={() => setModelOpen(true)}
            />
            <Txt size={10.5} color={c.textFaint} style={styles.disclaimer}>
              Intelligence can make mistakes. Verify important info.
            </Txt>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConversationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModelSheet open={modelOpen} onClose={() => setModelOpen(false)} />
      <ChatMenu target={menuTarget} onClose={() => setMenuTarget(null)} />
    </ScreenBackground>
  )
}

function HeaderButton({
  icon,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap
  color: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.hBtn, { opacity: pressed ? 0.5 : 1 }]}
    >
      <Feather name={icon} size={21} color={color} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  // inverted list flips vertical padding: paddingTop renders at the visual
  // bottom (24 above the composer) and paddingBottom at the visual top (12)
  thread: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, gap: 22 },
  disclaimer: { textAlign: 'center', marginTop: 6 },
  jumpWrap: { position: 'absolute', alignSelf: 'center' },
  jump: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
