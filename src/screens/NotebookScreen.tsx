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
import { removeProblem, setProblemSaved, subscribeProblems, type Problem } from '../solve/store'
import { useTheme } from '../theme/ThemeProvider'
import { readPracticeAttempts, type PracticeAttempt } from '../practice/store'
import { findPracticeExercise, type PracticeExam } from '../practice/catalog'
import { configuredSetFromId } from '../practice/generator'
import { calculateCompetencyEvidence } from '../practice/progress'
import { readOfficialAttempts, type OfficialPaperAttempt } from '../archive/store'
import type { BacTrack } from '../product/profile'
import { useProduct } from '../product/ProductProvider'

type Props = {
  onOpenSettings: () => void
  onOpenProblem: (problem: Problem) => void
  onSolve: () => void
  onOpenPractice: (exam: PracticeExam, setId: string, focusExerciseId?: string, bacTrack?: BacTrack) => void
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
  const { examGoal, bacTrack } = useProduct()
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
  const examMode = examGoal === 'en' || examGoal === 'bac'

  const relevantAttempts = useMemo(
    () => examMode
      ? attempts.filter((attempt) =>
          attempt.exam === examGoal && (examGoal !== 'bac' || attempt.profile === bacTrack),
        )
      : [],
    [attempts, bacTrack, examGoal, examMode],
  )
  const relevantOfficialAttempts = useMemo(
    () => examMode
      ? officialAttempts.filter((attempt) =>
          attempt.exam === examGoal && (examGoal !== 'bac' || attempt.profile === bacTrack),
        )
      : [],
    [bacTrack, examGoal, examMode, officialAttempts],
  )

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
    if (!focused || !user) return
    Promise.all([readPracticeAttempts(user.id), readOfficialAttempts(user.id)])
      .then(([practice, official]) => {
        setAttempts(practice)
        setOfficialAttempts(official)
      })
      .catch(() => {
        setAttempts([])
        setOfficialAttempts([])
      })
  }, [focused, user?.id])

  useEffect(() => {
    if (
      !autoSelectedRef.current &&
      loaded &&
      problems.length === 0 &&
      (relevantAttempts.length > 0 || relevantOfficialAttempts.length > 0)
    ) {
      autoSelectedRef.current = true
      setMode('tests')
    }
  }, [loaded, problems.length, relevantAttempts.length, relevantOfficialAttempts.length])

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
      relevantAttempts.flatMap((attempt) =>
        attempt.answers
          .filter((answer) => !answer.correct)
          .map((answer) => {
            const found = findPracticeExercise(answer.exerciseId, configuredSetFromId(attempt.setId))
            return found ? { attempt, answer, ...found } : null
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
      ),
    [relevantAttempts],
  )
  const progress = useMemo(() => calculateCompetencyEvidence(relevantAttempts), [relevantAttempts])

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
          eyebrow={examMode ? 'REZULTATE' : 'ISTORIC'}
          title={examMode ? 'Activitatea ta' : 'Problemele tale'}
          description={examMode
            ? 'Rezultate, greșeli și activități bazate numai pe ce ai lucrat.'
            : 'Toate problemele rezolvate și conversațiile tale.'}
          trailing={
            <Press
              onPress={onSolve}
              pressDepth={3}
              accessibilityLabel="Rezolvă o problemă nouă"
              style={[styles.add, { backgroundColor: c.accent, borderColor: c.border, borderBottomColor: c.border }]}
            >
              <RezIcon name="solve" size={20} color="#FFFFFF" accent={c.text} />
              <Txt weight="extrabold" size={14} color="#FFFFFF" style={{ fontFamily: theme.font.display }}>REZOLVĂ</Txt>
            </Press>
          }
        />

        {examMode && <SegmentedControl
          value={mode}
          accessibilityLabel="Conținutul activității"
          segments={[
            { value: 'problems', label: 'Probleme' },
            { value: 'tests', label: 'Teste' },
            { value: 'mistakes', label: 'Greșeli' },
            { value: 'progress', label: 'Rezultate' },
          ]}
          onChange={setMode}
        />}

        {examMode && mode === 'progress' ? (
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
                <View style={[styles.progressCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}>
                  <View style={styles.progressTop}>
                    <View style={styles.progressCopy}>
                      <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>{item.competency}</Txt>
                      <Txt size={11.5} color={c.textMuted}>
                        {item.attempts > 0
                          ? `${item.correct} ${item.correct === 1 ? 'răspuns corect' : 'răspunsuri corecte'} din ${item.attempts} ${item.attempts === 1 ? 'încercare independentă' : 'încercări independente'}`
                          : 'Nu există încă răspunsuri independente'}
                        {item.assistedAttempts > 0
                          ? ` · ${item.assistedAttempts} ${item.assistedAttempts === 1 ? 'încercare asistată' : 'încercări asistate'}`
                          : ''}
                      </Txt>
                      <Txt size={10.5} color={c.textFaint}>
                        {item.confidence === 'high'
                          ? 'Încredere ridicată în date'
                          : item.confidence === 'medium'
                            ? 'Încredere medie în date'
                            : item.confidence === 'low'
                              ? 'Date puține — rezultatul se poate schimba rapid'
                              : 'Neevaluat'}
                      </Txt>
                    </View>
                    <View style={[styles.percentBadge, {
                      backgroundColor: item.percent == null ? c.surfaceAlt : item.percent >= 70 ? c.successSoft : item.percent >= 40 ? c.sunnySoft : c.dangerSoft,
                      borderColor: c.border, borderBottomColor: c.border,
                    }]}>
                      <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.mono }}>
                        {item.percent == null ? 'Neevaluat' : `${item.percent}%`}
                      </Txt>
                    </View>
                  </View>
                  {item.percent != null && <View style={styles.progressTrack}>
                    <ProgressMeter
                      value={item.percent / 100}
                      tone={item.percent >= 70 ? c.chalk : item.percent >= 40 ? c.sunny : c.accent}
                    />
                  </View>}
                </View>
              )}
            />
          )
        ) : examMode && mode === 'mistakes' ? (
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
                  onPress={() => {
                    if (item.attempt.exam) onOpenPractice(item.attempt.exam, item.attempt.setId, item.exercise.id, item.attempt.profile)
                  }}
                  pressDepth={2}
                  style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: c.dangerSoft, borderColor: c.border, borderBottomColor: c.border }]}>
                    <RezIcon name="retry" size={24} color={c.danger} accent={c.danger} />
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
        ) : examMode && mode === 'tests' ? (
          relevantAttempts.length === 0 && relevantOfficialAttempts.length === 0 ? (
            <EmptyState
              icon="practice"
              title="Nicio activitate salvată"
              message="Testele și subiectele oficiale începute vor apărea aici automat."
            />
          ) : (
            <FlatList
              data={[
                ...relevantAttempts.map((attempt) => ({ kind: 'practice' as const, attempt, at: attempt.completedAt })),
                ...relevantOfficialAttempts.map((attempt) => ({
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
                      style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
                    >
                      <View style={[styles.itemIcon, { backgroundColor: attempt.completedAt ? c.successSoft : c.accentSoft, borderColor: c.border, borderBottomColor: c.border }]}>
                        <RezIcon name={attempt.completedAt ? 'verified' : 'document'} size={24} color={attempt.completedAt ? c.chalk : c.accent} accent={c.accent} />
                      </View>
                      <View style={styles.itemCopy}>
                        <Txt numberOfLines={1} weight="extrabold" size={15} color={c.text} style={{ fontFamily: theme.font.display }}>
                          {attempt.exam === 'en' ? 'Evaluare Națională' : 'Bacalaureat'} · {attempt.year}
                        </Txt>
                        <Txt numberOfLines={1} size={11.5} color={c.textMuted}>
                          {attempt.session} · {attempt.completedAt ? 'Finalizat' : 'În lucru'}
                          {typeof attempt.score === 'number' && typeof attempt.maxScore === 'number'
                            ? ` · ${attempt.score}/${attempt.maxScore} automat`
                            : ''} · {dateLabel(item.at)}
                        </Txt>
                      </View>
                      <RezIcon name={attempt.completedAt ? 'chevron' : 'forward'} size={18} color={c.textMuted} accent={c.sunny} />
                    </Press>
                  )
                }
                const attempt = item.attempt
                return (
                  <View style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}>
                    <View style={[styles.itemIcon, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}>
                      <Txt weight="extrabold" size={14} color={c.text} style={{ fontFamily: theme.font.mono }}>
                        {attempt.score}/{attempt.total}
                      </Txt>
                    </View>
                    <View style={styles.itemCopy}>
                      <Txt numberOfLines={1} weight="extrabold" size={15} color={c.text} style={{ fontFamily: theme.font.display }}>
                        {attempt.exam === 'en' ? 'Evaluare Națională' : attempt.exam === 'bac' ? 'Bacalaureat' : 'Exersare liberă'}
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
            <Txt size={13} color={c.textMuted}>Deschid activitatea…</Txt>
          </View>
        ) : problems.length === 0 ? (
          <EmptyState
            icon="document"
            title="Nu ai activitate salvată"
            message="După prima rezolvare, problema și explicația apar aici automat."
            action={{ title: 'Rezolvă prima problemă', icon: 'solve', onPress: onSolve }}
          />
        ) : (
          <>
            <View style={[styles.summaryBanner, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}>
              <RezIcon name="document" size={20} color={c.text} accent={c.text} />
              <Txt weight="extrabold" size={14} color={c.text} style={{ fontFamily: theme.font.display }}>
                {problems.length} {problems.length === 1 ? 'problemă salvată' : 'probleme salvate'}
              </Txt>
            </View>

            {problems.length >= 4 && (
              <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}>
                <RezIcon name="search" size={20} color={c.textFaint} accent={c.text} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Caută în probleme"
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
                  pressDepth={4}
                  style={[styles.itemCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: isPhotoProblem(item) ? c.accentSoft : c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}>
                    <RezIcon
                      name={isPhotoProblem(item) ? 'camera' : 'write'}
                      size={24}
                      color={c.text}
                      accent={c.text}
                    />
                  </View>
                  <View style={styles.itemCopy}>
                    <Txt numberOfLines={2} weight="extrabold" size={15} color={c.text} style={{ fontFamily: theme.font.display }}>
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
                      if (user) void setProblemSaved(user.id, item.id, !item.saved)
                    }}
                    accessibilityLabel={item.saved ? 'Elimină din salvate' : 'Salvează problema'}
                    hitSlop={8}
                    style={styles.delete}
                  >
                    <RezIcon
                      name="bookmark"
                      size={18}
                      color={item.saved ? c.bubblyRed : c.textFaint}
                      accent={item.saved ? c.bubblyYellow : c.textFaint}
                    />
                  </Press>
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
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 6,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  // Center loading
  center: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' },

  // Summary banner
  summaryBanner: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 7,
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  // Search
  search: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 7,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 20,
  },
  searchInput: { flex: 1, fontSize: 14.5, paddingVertical: 0 },

  // List
  list: { gap: 10, paddingBottom: 20, paddingTop: 8 },
  noResults: { paddingTop: 30, textAlign: 'center' },

  // Item card — used for problems, tests, mistakes
  itemCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 7,
    flexDirection: 'row',
    gap: 14,
    minHeight: 88,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemIcon: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 5,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  itemCopy: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', gap: 6 },
  delete: { alignItems: 'center', height: 40, justifyContent: 'center', width: 34 },

  // Progress card
  progressCard: {
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 7,
    padding: 20,
  },
  progressTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  progressCopy: { flex: 1, gap: 2 },
  percentBadge: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressTrack: { marginTop: 10 },
})
