import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import SegmentedControl from '../components/ui/SegmentedControl'
import PrimaryAction from '../components/ui/PrimaryAction'
import Txt from '../components/ui/Txt'
import { CHAPTERS, type PracticeChapter, type PracticeConfig } from '../practice/generator'
import { useProduct } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'

type Props = {
  onOpenSettings: () => void
  onStartPractice: (
    exam: 'en' | 'bac',
    options: { setId?: string; config?: PracticeConfig; mode?: 'practice' | 'simulation' },
    profile?: string,
  ) => void
}

const counts: Array<5 | 10 | 15> = [5, 10, 15]

export default function PreparationScreen({ onOpenSettings, onStartPractice }: Props) {
  const { theme } = useTheme()
  const { goal, bacProfile } = useProduct()
  const c = theme.colors
  const [exam, setExam] = useState<'en' | 'bac'>(goal === 'bac' ? 'bac' : 'en')
  const [mode, setMode] = useState<'practice' | 'simulation'>('practice')
  const [chapter, setChapter] = useState<PracticeChapter>('mixt')
  const [count, setCount] = useState<5 | 10 | 15>(10)
  const examTitle = exam === 'en' ? 'Evaluare Națională' : `BAC · ${bacProfile}`

  useEffect(() => {
    if (goal === 'en' || goal === 'bac') setExam(goal)
  }, [goal])

  useEffect(() => setChapter('mixt'), [exam])

  const start = () => {
    onStartPractice(
      exam,
      {
        mode,
        config: {
          chapter: mode === 'simulation' ? 'mixt' : chapter,
          count: mode === 'simulation' ? 15 : count,
          seed: Date.now() % 2_000_000_000,
        },
      },
      exam === 'bac' ? bacProfile : undefined,
    )
  }

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <ScreenContent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.page}
        >
          <ScreenHeading
            eyebrow="EXERSEAZĂ"
            title="Alege cum lucrezi"
            description="Antrenament cu ajutor sau simulare în condiții de examen."
          />

          {/* ─── Exam pill ─── */}
          <View style={[styles.goalRow, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}>
            <RezIcon name={exam === 'en' ? 'exam-en' : 'exam-bac'} size={17} color={c.text} accent={c.bubblyRed} />
            <Txt numberOfLines={1} weight="bold" size={13} color={c.text} style={styles.flex}>{examTitle}</Txt>
            <Press onPress={onOpenSettings} pressDepth={2} hitSlop={8}>
              <Txt weight="bold" size={12} color={c.bubblyRedDark}>Schimbă</Txt>
            </Press>
          </View>

          {goal === 'general' && (
            <SegmentedControl
              value={exam}
              accessibilityLabel="Examen pentru test"
              segments={[
                { value: 'en', label: 'Evaluare Națională' },
                { value: 'bac', label: 'Bacalaureat' },
              ]}
              onChange={setExam}
            />
          )}

          {/* ─── Mode selector ─── */}
          <SegmentedControl
            value={mode}
            accessibilityLabel="Modul de lucru"
            segments={[
              { value: 'practice', label: 'Antrenament' },
              { value: 'simulation', label: 'Simulare' },
            ]}
            onChange={setMode}
          />

          {mode === 'practice' ? (
            <>
              {/* ─── Chapter selection ─── */}
              <SectionLabel title="CAPITOLUL" />
              <View style={styles.chapters}>
                {CHAPTERS[exam].map((item) => {
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
                          ? {
                              backgroundColor: c.bubblyYellow,
                              borderColor: c.bubblyYellowDark,
                              borderBottomColor: c.bubblyYellowDark,
                            }
                          : {
                              backgroundColor: c.surface,
                              borderColor: c.cardEdge,
                              borderBottomColor: '#D0D0D0',
                            },
                      ]}
                    >
                      <View style={styles.chapterCopy}>
                        <Txt weight="bold" size={13.5} color={c.text}>{item.label}</Txt>
                        <Txt numberOfLines={1} size={11} color={c.textMuted}>{item.detail}</Txt>
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

              {/* ─── Count selection ─── */}
              <SectionLabel title="LUNGIMEA TESTULUI" />
              <SegmentedControl
                value={String(count) as '5' | '10' | '15'}
                accessibilityLabel="Numărul de exerciții"
                segments={counts.map((value) => ({ value: String(value) as '5' | '10' | '15', label: `${value} exerciții` }))}
                onChange={(value) => setCount(Number(value) as 5 | 10 | 15)}
              />
            </>
          ) : (
            /* ─── Simulation brief ─── */
            <View style={[styles.simCard, { backgroundColor: c.chalkDark, borderColor: '#0A2926', borderBottomColor: '#071F1D' }]}>
              <View style={[styles.simIcon, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}>
                <RezIcon name="simulate" size={26} color={c.text} accent={c.bubblyRed} />
              </View>
              <View style={styles.simCopy}>
                <Txt weight="bold" size={16} color="#FFFFFF">Simulare nouă</Txt>
                <Txt size={12.5} color="rgba(255,255,255,0.85)" style={styles.simDetail}>
                  15 exerciții mixte · cronometrat · fără indicii
                </Txt>
              </View>
            </View>
          )}

          {/* ─── Start CTA ─── */}
          <PrimaryAction
            title={mode === 'simulation' ? 'Pornește simularea' : 'Începe antrenamentul'}
            detail={mode === 'simulation'
              ? '15 exerciții · mod examen'
              : `${count} exerciții · aproximativ ${Math.max(5, Math.round(count * 1.5))} minute`}
            icon={mode === 'simulation' ? 'simulate' : 'drill'}
            tone={mode === 'simulation' ? 'ink' : 'chalk'}
            onPress={start}
          />
        </ScrollView>
      </ScreenContent>
    </ScreenBackground>
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

  // Goal pill
  goalRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 9,
    maxWidth: 280,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // Section label
  sectionLabel: {
    marginBottom: -4,
    marginTop: 4,
    paddingHorizontal: 2,
  },

  // Chapters
  chapters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chapterSlot: { width: '48%' },
  chapter: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 14,
    width: '100%',
  },
  chapterCopy: { flex: 1, gap: 2 },
  checkBadge: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },

  // Simulation card
  simCard: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 14,
    minHeight: 88,
    padding: 16,
  },
  simIcon: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  simCopy: { flex: 1, gap: 3 },
  simDetail: { lineHeight: 18 },
})
