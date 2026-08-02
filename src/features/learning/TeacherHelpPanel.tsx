import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Press from '../../components/ui/Press'
import RezIcon from '../../components/ui/RezIcon'
import Txt from '../../components/ui/Txt'
import { useTheme } from '../../theme/ThemeProvider'

type Props = {
  loading: boolean
  message: string
  onHint: () => void
  onMethod: () => void
}

export default function TeacherHelpPanel({
  loading,
  message,
  onHint,
  onMethod,
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={[styles.panel, { backgroundColor: c.chalkDark, borderColor: c.border, borderBottomColor: c.border }]}>
      <View style={styles.head}>
        <View style={[styles.mark, { backgroundColor: c.sunny }]}>
          <RezIcon name="teacher" size={20} color={c.text} accent={c.accent} />
        </View>
        <View style={styles.copy}>
          <Txt weight="bold" size={13.5} color="#FFFFFF">Ajutor AI</Txt>
          <Txt size={10.5} color="#BFE1D8">Enunțul și răspunsul tău rămân pe ecran</Txt>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.sunny} size="small" />
          <Txt size={12.5} color="#FFFFFF">Analizez răspunsul tău…</Txt>
        </View>
      ) : (
        <Txt size={13} color="#FFFFFF" style={styles.message}>{message}</Txt>
      )}

      <View style={styles.actions}>
        <Press onPress={onHint} style={[styles.action, { backgroundColor: '#FFFFFF', borderColor: c.border, borderBottomColor: c.border }]}>
          <Txt weight="bold" size={11.5} color={c.text}>Dă-mi un indiciu</Txt>
        </Press>
        <Press onPress={onMethod} style={[styles.action, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
          <Txt weight="bold" size={11.5} color={c.text}>Explică metoda</Txt>
        </Press>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: { borderRadius: 24, borderWidth: 2, borderBottomWidth: 6, gap: 11, marginTop: 12, padding: 14 },
  head: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  mark: { alignItems: 'center', borderRadius: 11, height: 38, justifyContent: 'center', width: 38 },
  copy: { flex: 1 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 30 },
  message: { lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 7 },
  action: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 4,
    flex: 1,
    justifyContent: 'center',
    minHeight: 39,
    paddingHorizontal: 8,
  },
})
