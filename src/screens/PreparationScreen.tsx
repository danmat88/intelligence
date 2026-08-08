import { useContext, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Press from '../components/ui/Press'
import PrimaryAction from '../components/ui/PrimaryAction'
import RezIcon from '../components/ui/RezIcon'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import SegmentedControl from '../components/ui/SegmentedControl'
import Entrance from '../components/ui/Entrance'
import Txt from '../components/ui/Txt'
import {
  chaptersFor,
  type PracticeChapter,
  type PracticeConfig,
} from '../practice/generator'
import { useProduct } from '../product/ProductProvider'
import { BAC_TRACK_LABELS, type BacTrack } from '../product/profile'
import { useTheme } from '../theme/ThemeProvider'
import type { RootStackParamList } from '../navigation/types'
import { GoalSheetContext } from '../navigation/GoalSheetContext'

const counts: Array<5 | 10 | 15> = [5, 10, 15]

export default function PreparationScreen() {
  const { theme } = useTheme()
  const { examGoal, bacTrack } = useProduct()
  const c = theme.colors
  const exam = examGoal === 'bac' ? 'bac' : 'en'
  const [chapter, setChapter] = useState<PracticeChapter>('mixt')
  const [count, setCount] = useState<5 | 10 | 15>(10)
  const chapters = useMemo(() => chaptersFor(exam, bacTrack), [bacTrack, exam])
  const examTitle = exam === 'en'
    ? 'Evaluarea Națională'
    : `BAC · ${BAC_TRACK_LABELS[bacTrack ?? 'mate_info']}`
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const onChangeGoal = useContext(GoalSheetContext)

  useEffect(() => {
    if (!chapters.some((item) => item.id === chapter)) setChapter('mixt')
  }, [chapter, chapters])

  const start = () => {
    navigation.navigate('Activitate', {
      exam,
      mode: 'practice',
      config: {
        chapter,
        count,
        seed: Date.now() % 2_000_000_000,
      },
      bacTrack: exam === 'bac' ? bacTrack ?? 'mate_info' : undefined,
    })
  }

  return (
    <View style={styles.flex}>
      <ScreenContent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.page}
        >
          <Entrance delay={0}>
            <ScreenHeading
              eyebrow="EXERCIȚII"
              title="Alege ce exersezi"
              description="Lucrezi exerciții scurte. Simulările complete se pornesc numai dintr-un subiect oficial."
            />
          </Entrance>

          <Entrance delay={45}>
            <Press
              onPress={onChangeGoal}
              pressDepth={2}
              style={[styles.goalRow, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}
            >
              <RezIcon name={exam === 'en' ? 'exam-en' : 'exam-bac'} size={18} color={c.text} accent={c.bubblyRed} />
              <Txt numberOfLines={1} weight="bold" size={13} color={c.text} style={styles.flex}>{examTitle}</Txt>
              <Txt weight="bold" size={11.5} color={c.bubblyRedDark}>Schimbă</Txt>
            </Press>
          </Entrance>

          <Entrance delay={90}>
            <SectionLabel title="TIPUL EXERCIȚIILOR" />
            <View style={styles.chapters}>
              {chapters.map((item) => {
                const selected = chapter === item.id
                return (
                  <Press
                    key={item.id}
                    onPress={() => setChapter(item.id)}
                    pressDepth={3}
                    containerStyle={styles.chapterSlot}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.chapter,
                      selected
                        ? { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }
                        : { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' },
                    ]}
                  >
                    <View style={styles.chapterCopy}>
                      <Txt weight="bold" size={13.5} color={c.text}>{item.label}</Txt>
                      <Txt numberOfLines={2} size={11} color={c.textMuted}>{item.detail}</Txt>
                    </View>
                    {selected && (
                      <View style={[styles.checkBadge, { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark }]}>
                        <RezIcon name="check" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </Press>
                )
              })}
            </View>
          </Entrance>

          <Entrance delay={135}>
            <SectionLabel title="NUMĂRUL DE EXERCIȚII" />
            <SegmentedControl
              value={String(count) as '5' | '10' | '15'}
              accessibilityLabel="Numărul de exerciții"
              segments={counts.map((value) => ({
                value: String(value) as '5' | '10' | '15',
                label: `${value} exerciții`,
              }))}
              onChange={(value) => setCount(Number(value) as 5 | 10 | 15)}
            />
          </Entrance>

          <Entrance delay={180}>
            <PrimaryAction
              title="Începe exercițiile"
              detail={`${count} exerciții · cu indicii disponibile`}
              icon="drill"
              tone="chalk"
              onPress={start}
            />
          </Entrance>
        </ScrollView>
      </ScreenContent>
    </View>
  )
}

function SectionLabel({ title }: { title: string }) {
  const { theme } = useTheme()
  return (
    <Txt
      weight="bold"
      size={11}
      color={theme.colors.bubblyRed}
      style={[styles.sectionLabel, { fontFamily: theme.font.mono, letterSpacing: 1.2 }]}
    >
      {title}
    </Txt>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 14, paddingBottom: 24, paddingTop: 4 },
  goalRow: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 99, borderWidth: 2, borderBottomWidth: 4, flexDirection: 'row', gap: 9, maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 9 },
  sectionLabel: { marginBottom: -4, marginTop: 4, paddingHorizontal: 2 },
  chapters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chapterSlot: { width: '48%' },
  chapter: { alignItems: 'center', borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, flexDirection: 'row', gap: 10, minHeight: 78, paddingHorizontal: 14, width: '100%' },
  chapterCopy: { flex: 1, gap: 2 },
  checkBadge: { alignItems: 'center', borderRadius: 12, borderWidth: 2, borderBottomWidth: 4, height: 28, justifyContent: 'center', width: 28 },
})
