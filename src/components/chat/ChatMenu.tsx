import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useChat } from '../../chat/store'
import ConfirmDialog from '../ui/ConfirmDialog'
import InputDialog from '../ui/InputDialog'
import Overlay from '../ui/Overlay'
import { useToast } from '../ui/Toast'
import Txt from '../ui/Txt'

export type ChatMenuTarget = { id: string; title: string; starred?: boolean }

/**
 * The ⋯ menu for a conversation: Rename / Star / Delete, as a bottom sheet
 * on the app's own overlay engine. Controlled by `target` (null = closed).
 */
export default function ChatMenu({
  target,
  onClose,
}: {
  target: ChatMenuTarget | null
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { renameChat, toggleStar, deleteChat } = useChat()
  const [renaming, setRenaming] = useState<ChatMenuTarget | null>(null)
  const [deleting, setDeleting] = useState<ChatMenuTarget | null>(null)

  return (
    <>
      <Overlay open={target !== null} onClose={onClose} align="bottom">
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 14 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <Txt numberOfLines={1} size={14} color={c.textFaint} style={{ paddingHorizontal: 14, marginBottom: 6 }}>
            {target?.title}
          </Txt>

          <Row
            icon="edit-3"
            label="Rename"
            color={c.text}
            iconColor={c.textMuted}
            onPress={() => {
              if (target) setRenaming(target)
              onClose()
            }}
          />
          <Row
            icon="star"
            label={target?.starred ? 'Unstar' : 'Star'}
            color={c.text}
            iconColor={target?.starred ? c.accent : c.textMuted}
            onPress={() => {
              if (target) {
                toggleStar(target.id)
                toast.show(target.starred ? 'Removed from starred' : 'Starred', 'star')
              }
              onClose()
            }}
          />
          <Row
            icon="trash-2"
            label="Delete"
            color={c.danger}
            iconColor={c.danger}
            onPress={() => {
              if (target) setDeleting(target)
              onClose()
            }}
          />
        </View>
      </Overlay>

      <InputDialog
        open={renaming !== null}
        title="Rename chat"
        initialValue={renaming?.title ?? ''}
        placeholder="Chat name"
        onSubmit={(title) => renaming && renameChat(renaming.id, title)}
        onClose={() => setRenaming(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete chat?"
        message={`"${deleting?.title ?? ''}" and its messages will be gone forever.`}
        onConfirm={() => deleting && deleteChat(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

function Row({
  icon,
  label,
  color,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap
  label: string
  color: string
  iconColor: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={18} color={iconColor} />
      <Txt size={15.5} color={color}>
        {label}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 2,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14 },
})
