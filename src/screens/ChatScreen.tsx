import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useChat } from '../chat/store'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'
import Message from '../components/chat/Message'
import Composer from '../components/chat/Composer'
import EmptyState from '../components/chat/EmptyState'
import ConversationsDrawer from '../components/chat/ConversationsDrawer'
import SettingsModal from './SettingsModal'

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
  const { theme, mode, toggle } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { current, sending, send, newChat, loadOlder } = useChat()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const listRef = useRef<FlatList<(typeof current.messages)[number]>>(null)

  const empty = current.messages.length === 0

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

  return (
    <ScreenBackground>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* transparent header - buttons float over the app, no bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <HeaderButton icon="menu" color={c.text} onPress={() => setDrawerOpen(true)} />
        <Txt numberOfLines={1} weight="bold" size={16} color={c.textMuted} style={styles.title}>
          {empty ? 'Intelligence' : current.title}
        </Txt>
        <View style={styles.headerRight}>
          <HeaderButton icon={mode === 'dark' ? 'sun' : 'moon'} color={c.text} onPress={toggle} />
          <HeaderButton icon="edit" color={c.text} onPress={newChat} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom}
      >
        <View style={styles.column}>
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
            />
          )}

          <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 8 }}>
            <Composer onSend={send} sending={sending} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConversationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
  title: { flex: 1, textAlign: 'center', marginHorizontal: 8 },
  hBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  // inverted list flips vertical padding: paddingTop renders at the visual
  // bottom (24 above the composer) and paddingBottom at the visual top (12)
  thread: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, gap: 22 },
})
