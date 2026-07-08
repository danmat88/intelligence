import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { MODELS, useChat, type ModelChoice } from '../../chat/store'
import BrandGradient from '../ui/BrandGradient'
import Txt from '../ui/Txt'

const ICONS: Record<ModelChoice, keyof typeof Feather.glyphMap> = {
  flash: 'zap',
  pro: 'cpu',
}

/**
 * The header-arrow sheet, ChatGPT-style: pick which model answers.
 * Edge-to-edge, drag handle, active row highlighted.
 */
export default function ModelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { model, setModel } = useChat()

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <Txt size={18} style={{ fontFamily: theme.font.display, paddingHorizontal: 8, marginBottom: 10 }}>
          Choose a model
        </Txt>

        {(Object.keys(MODELS) as ModelChoice[]).map((m) => {
          const active = m === model
          const info = MODELS[m]
          return (
            <Pressable
              key={m}
              onPress={() => {
                setModel(m)
                onClose()
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: active ? c.surfaceAlt : 'transparent',
                  borderColor: active ? c.accent + '44' : 'transparent',
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <BrandGradient style={[styles.icon, { opacity: active ? 1 : 0.5 }]}>
                <Feather name={ICONS[m]} size={15} color={c.onAccent} />
              </BrandGradient>
              <View style={{ flex: 1 }}>
                <Txt weight={active ? 'semibold' : 'medium'} size={15.5}>
                  {info.label}
                </Txt>
                <Txt size={12.5} color={c.textFaint}>
                  {info.blurb}
                </Txt>
              </View>
              {active && <Feather name="check-circle" size={18} color={c.accent} />}
            </Pressable>
          )
        })}

        <Txt size={11.5} color={c.textFaint} style={{ paddingHorizontal: 8, marginTop: 8, lineHeight: 16 }}>
          Applies to your next message. Flash is fast; Pro thinks harder and takes longer.
        </Txt>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
