import { StyleSheet, View } from 'react-native'
import type { OfficialExercise } from '../../archive/content'
import Txt from '../../components/ui/Txt'
import { useTheme } from '../../theme/ThemeProvider'

export default function OfficialSolution({ exercise }: { exercise: OfficialExercise }) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={[styles.solution, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Txt weight="bold" size={11} color={c.chalk}>REZOLVARE</Txt>
      {exercise.solution.map((step, index) => (
        <View key={`${exercise.id}-step-${index}`} style={styles.step}>
          <View style={[styles.number, { backgroundColor: c.chalk }]}>
            <Txt weight="bold" size={10.5} color="#FFFFFF">{index + 1}</Txt>
          </View>
          <Txt size={13.5} color={c.text} style={styles.copy}>{step}</Txt>
        </View>
      ))}
      <View style={[styles.answer, { backgroundColor: c.successSoft }]}>
        <Txt weight="bold" size={12.5} color={c.chalk}>
          Răspuns: {exercise.expectedAnswer}
        </Txt>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  solution: { borderRadius: 18, borderWidth: 1.5, gap: 12, marginTop: 10, padding: 15 },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  number: { alignItems: 'center', borderRadius: 99, height: 23, justifyContent: 'center', marginTop: 1, width: 23 },
  copy: { flex: 1, lineHeight: 21 },
  answer: { borderRadius: 12, marginTop: 2, padding: 12 },
})
