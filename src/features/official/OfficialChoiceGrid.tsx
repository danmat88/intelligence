import { StyleSheet, View } from 'react-native'
import type { OfficialExercise } from '../../archive/content'
import Press from '../../components/ui/Press'
import RezIcon from '../../components/ui/RezIcon'
import Txt from '../../components/ui/Txt'
import { useTheme } from '../../theme/ThemeProvider'

type Props = {
  exercise: OfficialExercise
  value: string
  revealAnswer: boolean
  onChange: (value: string) => void
}

export default function OfficialChoiceGrid({
  exercise,
  value,
  revealAnswer,
  onChange,
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={styles.grid}>
      {exercise.options?.map((option) => {
        const selected = value === option.id
        const correct = revealAnswer && option.id === exercise.correctOption
        return (
          <Press
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Varianta ${option.id.toUpperCase()}: ${option.label}`}
            style={[
              styles.option,
              {
                backgroundColor: correct ? c.successSoft : selected ? c.accentSoft : c.surface,
                borderColor: correct ? c.success : selected ? c.accent : c.border,
              },
            ]}
          >
            <View style={[styles.letter, { backgroundColor: selected ? c.accent : c.surfaceAlt }]}>
              <Txt weight="bold" size={12.5} color={selected ? '#FFFFFF' : c.text}>
                {option.id.toUpperCase()}
              </Txt>
            </View>
            <Txt weight="bold" size={14} color={c.text} style={styles.copy}>
              {option.label}
            </Txt>
            {correct && <RezIcon name="check" size={18} color={c.success} />}
          </Press>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  option: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    padding: 7,
    width: '48.7%',
  },
  letter: {
    alignItems: 'center',
    borderRadius: 10,
    height: 35,
    justifyContent: 'center',
    width: 35,
  },
  copy: { flex: 1 },
})
