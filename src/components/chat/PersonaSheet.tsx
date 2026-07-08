import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { PERSONAS, useChat, type Persona } from '../../chat/store'
import BrandGradient from '../ui/BrandGradient'
import Txt from '../ui/Txt'

const ICONS: Record<Persona, keyof typeof Feather.glyphMap> = {
  balanced: 'zap',
  creative: 'feather',
  precise: 'crosshair',
}

/** Bottom sheet for switching the AI's response style. */
export default function PersonaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { persona, setPersona } = useChat()

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <Txt size={19} style={{ fontFamily: theme.font.display, paddingHorizontal: 6, marginBottom: 6 }}>
          Response style
        </Txt>
        {(Object.keys(PERSONAS) as Persona[]).map((p) => {
          const active = p === persona
          const info = PERSONAS[p]
          return (
            <Pressable
              key={p}
              onPress={() => {
                setPersona(p)
                onClose()
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: active ? c.surfaceAlt : 'transparent',
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <BrandGradient style={[styles.icon, { opacity: active ? 1 : 0.55 }]}>
                <Feather name={ICONS[p]} size={14} color={c.onAccent} />
              </BrandGradient>
              <View style={{ flex: 1 }}>
                <Txt weight={active ? 'semibold' : 'medium'} size={15.5}>
                  {info.label}
                </Txt>
                <Txt size={12.5} color={c.textFaint}>
                  {info.blurb}
                </Txt>
              </View>
              {active && <Feather name="check" size={18} color={c.accent} />}
            </Pressable>
          )
        })}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
