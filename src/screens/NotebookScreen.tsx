import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { useAuth } from '../auth/AuthProvider'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import SegmentedControl from '../components/ui/SegmentedControl'
import ProgressMeter from '../components/ui/ProgressMeter'
import EmptyState from '../components/ui/EmptyState'
import Txt from '../components/ui/Txt'
import { useToast } from '../components/ui/Toast'
import { deleteProblemImages } from '../solve/imageStore'
import { removeProblem, subscribeProblems, type Problem } from '../solve/store'
import { useTheme } from '../theme/ThemeProvider'
import { readPracticeAttempts, type PracticeAttempt } from '../practice/store'
import { findPracticeExercise, type PracticeExam } from '../practice/catalog'
import { configuredSetFromId } from '../practice/generator'
import { calculateCompetencyProgress } from '../practice/progress'
import { readOfficialAttempts, type OfficialPaperAttempt } from '../archive/store'

type Props = {
  onOpenSettings: () => void
  onOpenProblem: (problem: Problem) => void
  onSolve: () => void
  onOpenPractice: (exam: PracticeExam, setId: string, focusExerciseId?: string) => void
  onOpenOfficialAttempt: (attempt: OfficialPaperAttempt) => void
  initialMode?: 'problems' | 'tests' | 'mistakes' | 'progress'
}

function cleanTitle(title: string): string {
  return title.replace(/^\s*📷\s*/, '').trim()
}

function isPhotoProblem(problem: Problem): boolean {
  if (typeof problem.photo === 'boolean') return problem.photo
  return /📷/.test(problem.title) || /^(Photo problem|Problemă din poză)$/.test(cleanTitle(problem.title))
}

function dateLabel(createdAt: number): string {
  const date = new Date(createdAt)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Astăzi'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Ieri'
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
}

export default function NotebookScreen({
  onOpenSettings,
  onOpenProblem,
  onSolve,
  onOpenPractice,
  onOpenOfficialAttempt,
  initialMode = 'problems',
}: Props) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const focused = useIsFocused()
  const c = theme.colors
  const [problems, setProblems] = useState<Problem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'problems' | 'tests' | 'mistakes' | 'progress'>(initialMode)
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [officialAttempts, setOfficialAttempts] = useState<OfficialPaperAttempt[]>([])
  const autoSelectedRef = useRef(initialMode !== 'problems')

  useEffect(() => setMode(initialMode), [initialMode])

  useEffect(() => {
    setProblems([])
    setLoaded(false)
    if (!user) return
    return subscribeProblems(user.id, (items) => {
      setProblems(items)
      setLoaded(true)
    })
  }, [user?.id])

  useEffect(() => {
    if (!focused) return
    Promise.all([readPracticeAttempts(), readOfficialAttempts()])
      .then(([practice, official]) => {
        setAttempts(practice)
        setOfficialAttempts(official)
      })
      .catch(() => {
        setAttempts([])
        setOfficialAttempts([])
      })
  }, [focused])

  useEffect(() => {
    if (
      !autoSelectedRef.current &&
      loaded &&
      problems.length === 0 &&
      (attempts.length > 0 || officialAttempts.length > 0)
    ) {
      autoSelectedRef.current = true
      setMode('tests')
    }
  }, [attempts.length, loaded, officialAttempts.length, problems.length])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ro-RO')
    if (!needle) return problems
    return problems.filter(
      (problem) =>
        cleanTitle(problem.title).toLocaleLowerCase('ro-RO').includes(needle) ||
        (problem.topic ?? '').toLocaleLowerCase('ro-RO').includes(needle),
    )
  }, [problems, query])

  const mistakes = useMemo(
    () =>
      attempts.flatMap((attempt) =>
        attempt.answers
          .filter((answer) => !answer.correct)
          .map((answer) => {
            const found = findPracticeExercise(answer.exerciseId, configuredSetFromId(attempt.setId))
            return found ? { attempt, answer, ...found } : null
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
      ),
    [attempts],
  )
  const progress = useMemo(() => calculateCompetencyProgress(attempts), [attempts])

  const remove = useCallback(
    (problem: Problem) => {
      if (!user) return
      removeProblem(user.id, problem.id)
        .then(() => {
          deleteProblemImages(problem.turns.map((turn) => turn.imagePath))
          toast.show('Problema a fost ștearsă', 'trash-2')
        })
        .catch(() => toast.show('Nu am putut șterge problema', 'alert-triangle'))
    },
    [toast, user],
  )

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <ScreenContent style={styles.page}>
        <ScreenHeading
          eyebrow="CAIET"
          title="Caietul meu"
          description="Tot ce ai lucrat, într-un singur loc."
          trailing={
            <Press
              onPress={onSolve}
              pressDepth={3}
              accessibilityLabel="Rezolvă o problemă nouă"
              style={[styles.add, { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark, borderBottomColor: c.bubblyRedDark }]}
            >
              <RezIcon name="solve" size={16} color="#FFFFFF" accent={c.bubblyYellow} />
              <Txt weight="bold" size={12} color="#FFFFFF">Rezolvă</Txt>
            </Press>
          }
        />

        <SegmentedControl
          value={mode}
          accessibilityLabel="Conținutul caietului"
          segments={[
            { value: 'problems', label: 'Probleme' },
            { value: 'tests', label: 'Teste' },
            { value: 'mistakes', label: 'Greșeli' },
            { value: 'progress', label: 'Progres' },
          ]}
          onChange={setMode}
        />

        {mode === 'progress' ? (
          progress.length === 0 ? (
            <EmptyState
              icon="compass"
              title="Încă nu avem suficiente dovezi"
              message="Termină un test, iar aici vei vedea competențele măsurate din răspunsurile tale."
            />
          ) : (
            <FlatList
              data={progress}
              keyExtractor={(item) => item.competency}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={[styles.progressCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
                  <View style={styles.progressTop}>
                    <View style={styles.progressCopy}>
                      <Txt weight="bold" size={14} color={c.text}>{item.competency}</Txt>
                      <Txt size={11.5} color={c.textMuted}>
                        {item.correct} {item.correct === 1 ? 'răspuns corect' : 'răspunsuri corecte'} din{' '}
                        {item.attempts} {item.attempts === 1 ? 'încercare' : 'încercări'}
                      </Txt>
                    </View>
                    <View style={[styles.percentBadge, {
                      backgroundColor: item.percent >= 70 ? c.successSoft : item.percent >= 40 ? c.sunnySoft : c.dangerSoft,
                      borderColor: item.percent >= 70 ? c.bubblyGreenDark : item.percent >= 40 ? c.bubblyYellowDark : c.bubblyRedDark,
                    }]}>
                      <Txt weight="bold" size={14} color={c.text} style={{ fontFamily: theme.font.mono }}>
                        {item.percent}%
                      </Txt>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <ProgressMeter
                      value={item.percent / 100}
                      tone={item.percent >= 70 ? c.chalk : item.percent >= 40 ? c.sunny : c.accent}
                    />
                  </View>
                </View>
              )}
            />
          )
        ) : mode === 'mistakes' ? (
          mistakes.length === 0 ? (
            <EmptyState
              icon="mistakes"
              title="Nicio greșeală de reluat"
              message="Exercițiile greșite din teste vor apărea aici, cu acces direct la exercițiul respectiv."
            />
          ) : (
            <FlatList
              data={mistakes}
              keyExtractor={(item, index) => `${item.attempt.id}-${item.exercise.id}-${index}`}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Press
                  onPress={() => onOpenPractice(item.attempt.exam, item.attempt.setId, item.exercise.id)}
                  pressDepth={2}
                  style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: c.dangerSoft, borderColor: c.bubblyRedDark }]}>
                    <RezIcon name="retry" size={20} color={c.danger} accent={c.danger} />
                  </View>
                  <View style={styles.itemCopy}>
                    <Txt numberOfLines={2} weight="semibold" size={13.5} color={c.text}>
                      {item.exercise.prompt}
                    </Txt>
                    <Txt size={11.5} color={c.textMuted}>{item.exercise.competency}</Txt>
                  </View>
                  <RezIcon name="chevron" size={16} color={c.textFaint} />
                </Press>
              )}
            />
          )
        ) : mode === 'tests' ? (
          attempts.length === 0 && officialAttempts.length === 0 ? (
            <EmptyState
              icon="practice"
              title="Nicio activitate salvată"
              message="Testele și subiectele oficiale începute vor apărea aici automat."
            />
          ) : (
            <FlatList
              data={[
                ...attempts.map((attempt) => ({ kind: 'practice' as const, attempt, at: attempt.completedAt })),
                ...officialAttempts.map((attempt) => ({
                  kind: 'official' as const,
                  attempt,
                  at: attempt.completedAt ?? attempt.startedAt,
                })),
              ].sort((a, b) => b.at - a.at)}
              keyExtractor={(item) => `${item.kind}-${item.attempt.id}`}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                if (item.kind === 'official') {
                  const attempt = item.attempt
                  return (
                    <Press
                      onPress={() => onOpenOfficialAttempt(attempt)}
                      pressDepth={2}
                      accessibilityLabel={`${attempt.completedAt ? 'Revizuiește' : 'Continuă'} ${attempt.session}`}
                      style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
                    >
                      <View style={[styles.itemIcon, { backgroundColor: attempt.completedAt ? c.successSoft : c.accentSoft, borderColor: attempt.completedAt ? c.bubblyGreenDark : c.bubblyRedDark }]}>
                        <RezIcon name={attempt.completedAt ? 'verified' : 'document'} size={20} color={attempt.completedAt ? c.chalk : c.accent} accent={c.accent} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Txt numberOfLines={1} weight="bold" size={14} color={c.text}>
                          {attempt.exam === 'en' ? 'Evaluare Națională' : 'Bacalaureat'} · {attempt.year}
                        </Txt>
                        <Txt numberOfLines={1} size={11.5} color={c.textMuted}>
                          {attempt.session} · {attempt.completedAt ? 'Finalizat' : 'În lucru'}
                          {typeof attempt.score === 'number' ? ` · ${attempt.score}/100` : ''} · {dateLabel(item.at)}
                        </Txt>
                      </View>
                      <RezIcon name={attempt.completedAt ? 'chevron' : 'forward'} size={18} color={c.textMuted} accent={c.sunny} />
                    </Press>
                  )
                }
                const attempt = item.attempt
                return (
                  <View style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
                    <View style={[styles.itemIcon, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark }]}>
                      <Txt weight="bold" size={13} color={c.text} style={{ fontFamily: theme.font.mono }}>
                        {attempt.score}/{attempt.total}
                      </Txt>
                    </View>
                    <View style={styles.itemCopy}>
                      <Txt numberOfLines={1} weight="bold" size={14} color={c.text}>
                        {attempt.exam === 'en' ? 'Evaluare Națională' : 'Bacalaureat'}
                      </Txt>
                      <Txt numberOfLines={1} size={11.5} color={c.textMuted}>
                        {configuredSetFromId(attempt.setId)?.title ?? 'Set de exerciții'} · {dateLabel(attempt.completedAt)}
                      </Txt>
                    </View>
                    <RezIcon name="verified" size={20} color={c.chalk} accent={c.chalk} />
                  </View>
                )
              }}
            />
          )
        ) : !loaded ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.bubblyRed} />
            <Txt size={13} color={c.textMuted}>Deschid caietul…</Txt>
          </View>
        ) : problems.length === 0 ? (
          <EmptyState
            icon="document"
            title="Caietul tău e gol"
            message="După prima rezolvare, problema și explicația apar aici automat."
            action={{ title: 'Rezolvă prima problemă', icon: 'solve', onPress: onSolve }}
          />
        ) : (
          <>
            <View style={[styles.summaryBanner, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark }]}>
              <RezIcon name="document" size={16} color={c.text} accent={c.bubblyRed} />
              <Txt weight="bold" size={13} color={c.text}>
                {problems.length} {problems.length === 1 ? 'problemă salvată' : 'probleme salvate'}
              </Txt>
            </View>

            {problems.length >= 4 && (
              <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
                <RezIcon name="search" size={18} color={c.textFaint} accent={c.bubblyRed} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Caută în caiet"
                  placeholderTextColor={c.textFaint}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: c.text, fontFamily: theme.font.regular }]}
                />
                {!!query && (
                  <Press onPress={() => setQuery('')} hitSlop={8}>
                    <RezIcon name="close" size={16} color={c.textFaint} />
                  </Press>
                )}
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(problem) => problem.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Txt size={13} color={c.textMuted} style={styles.noResults}>
                  Nu există rezultate pentru această căutare.
                </Txt>
              }
              renderItem={({ item }) => (
                <Press
                  onPress={() => onOpenProblem(item)}
                  pressDepth={2}
                  style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: isPhotoProblem(item) ? c.accentSoft : c.sunnySoft, borderColor: isPhotoProblem(item) ? c.bubblyRedDark : c.bubblyYellowDark }]}>
                    <RezIcon
                      name={isPhotoProblem(item) ? 'camera' : 'write'}
                      size={20}
                      color={c.text}
                      accent={c.bubblyRed}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Txt numberOfLines={2} weight="semibold" size={14} color={c.text}>
                      {item.topic || cleanTitle(item.title)}
                    </Txt>
                    <View style={styles.meta}>
                      <Txt numberOfLines={1} size={11} color={c.chalk}>
                        {isPhotoProblem(item) ? 'Din fotografie' : 'Problemă scrisă'}
                      </Txt>
                      <Txt size={11} color={c.textFaint}>·</Txt>
                      <Txt size={11} color={c.textFaint}>{dateLabel(item.createdAt)}</Txt>
                    </View>
                  </View>
                  <Press
                    onPress={(event) => {
                      event.stopPropagation()
                      remove(item)
                    }}
                    accessibilityLabel="Șterge problema"
                    hitSlop={8}
                    style={styles.delete}
                  >
                    <RezIcon name="trash" size={17} color={c.textFaint} accent={c.danger} />
                  </Press>
                  <RezIcon name="chevron" size={15} color={c.textFaint} />
                </Press>
              )}
            />
          </>
        )}
      </ScreenContent>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 12, paddingBottom: 8, paddingTop: 5 },

  // Add button
  add: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 3.5,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  // Center loading
  center: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },

  // Summary banner
  summaryBanner: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  // Search
  search: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 },

  // List
  list: { gap: 10, paddingBottom: 20, paddingTop: 8 },
  noResults: { paddingTop: 30, textAlign: 'center' },

  // Item card — used for problems, tests, mistakes
  itemCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemIcon: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  itemCopy: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', gap: 6 },
  delete: { alignItems: 'center', height: 40, justifyContent: 'center', width: 34 },

  // Progress card
  progressCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: 14,
  },
  progressTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  progressCopy: { flex: 1, gap: 2 },
  percentBadge: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressTrack: { marginTop: 10 },
})
