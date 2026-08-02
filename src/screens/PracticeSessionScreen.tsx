import { useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import ContextHeader from '../components/ui/ContextHeader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import PrimaryAction from '../components/ui/PrimaryAction'
import ProgressMeter from '../components/ui/ProgressMeter'
import Txt from '../components/ui/Txt'
import { answerMatches, getPracticeSet, type PracticeExam } from '../practice/catalog'
import { buildConfiguredSet, configuredSetFromId, type PracticeConfig } from '../practice/generator'
import {
  savePracticeAttempt,
  type PracticeAssistance,
  type PracticeAttemptAnswer,
} from '../practice/store'
import { useTheme } from '../theme/ThemeProvider'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TeacherHelpPanel from '../features/learning/TeacherHelpPanel'
import { followUpGuided } from '../solve/solve'
import { useAuth } from '../auth/AuthProvider'
import { BAC_TRACK_LABELS, type BacTrack } from '../product/profile'

type Props = {
  exam: PracticeExam
  setId?: string
  config?: PracticeConfig
  bacTrack?: BacTrack
  mode?: 'practice' | 'simulation'
  focusExerciseId?: string
  onBack: () => void
  onFinish: () => void
}

type AnswerState = { value: string; correct: boolean } | null

export default function PracticeSessionScreen({
  exam,
  setId,
  config,
  bacTrack,
  mode = 'practice',
  focusExerciseId,
  onBack,
  onFinish,
}: Props) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const c = theme.colors
  const set = useMemo(
    () => (config ? buildConfiguredSet(exam, config, bacTrack) : configuredSetFromId(setId ?? '') ?? getPracticeSet(exam, setId)),
    [bacTrack, config, exam, setId],
  )
  const initialIndex = Math.max(0, set.exercises.findIndex((item) => item.id === focusExerciseId))
  const [index, setIndex] = useState(initialIndex)
  const [value, setValue] = useState('')
  const [answer, setAnswer] = useState<AnswerState>(null)
  const [incorrect, setIncorrect] = useState(false)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [confirmSolution, setConfirmSolution] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [teacherVisible, setTeacherVisible] = useState(false)
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [teacherReply, setTeacherReply] = useState('')
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<PracticeAttemptAnswer[]>([])
  const [assistance, setAssistance] = useState<PracticeAssistance>('none')
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef(Date.now())
  const exercise = set.exercises[index]
  const finished = index >= set.exercises.length
  const progress = finished ? 1 : (index + 1) / set.exercises.length

  useEffect(() => {
    if (mode !== 'simulation' || finished) return
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [finished, mode])

  const elapsedLabel = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`

  const saveCompletedAttempt = (finalAnswers: PracticeAttemptAnswer[]) => {
    if (!user) return
    const completedAt = Date.now()
    savePracticeAttempt(user.id, {
      id: `${completedAt}`,
      setId: set.id,
      exam,
      profile: exam === 'bac' ? bacTrack : undefined,
      score: finalAnswers.filter((item) => item.correct).length,
      total: set.exercises.length,
      startedAt: startedAtRef.current,
      completedAt,
      answers: finalAnswers,
      mode,
      elapsedSeconds: Math.floor((completedAt - startedAtRef.current) / 1000),
    }).catch(() => {})
  }

  const resultMessage = useMemo(() => {
    if (!finished) return ''
    const ratio = score / set.exercises.length
    if (ratio === 1) return 'Excelent. Ai rezolvat corect întregul test.'
    if (ratio >= 0.7) return 'Rezultat bun. Consolidăm exact punctele rămase.'
    return 'Avem un punct de pornire clar. Refacem exact ce te-a blocat.'
  }, [finished, score, set.exercises.length])
  const wrongAnswers = useMemo(
    () => answers
      .filter((item) => !item.correct)
      .map((item) => ({
        answer: item,
        exercise: set.exercises.find((exerciseItem) => exerciseItem.id === item.exerciseId),
      }))
      .filter((item): item is { answer: PracticeAttemptAnswer; exercise: NonNullable<typeof item.exercise> } => !!item.exercise),
    [answers, set.exercises],
  )

  if (finished) {
    return (
      <ScreenBackground>
        <ContextHeader eyebrow="REZULTAT" title={mode === 'simulation' ? 'Simulare terminată' : 'Activitate terminată'} onBack={onBack} backLabel="Închide" />
        <ScreenContent>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.resultPage, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={[styles.resultHero, { backgroundColor: c.chalkDark }]}>
              <View>
                <Txt weight="bold" size={10.5} color={c.sunny}>REZULTATUL TĂU</Txt>
                <Txt style={[styles.score, { fontFamily: theme.font.display }]}>{score}/{set.exercises.length}</Txt>
              </View>
              <View style={styles.resultHeroCopy}>
                <Txt weight="bold" size={17} color="#FFFFFF">{resultMessage}</Txt>
                <Txt size={12} color="rgba(255,255,255,0.72)">
                  {wrongAnswers.length === 0
                    ? 'Nu ai nicio greșeală de reluat.'
                    : `${wrongAnswers.length} ${wrongAnswers.length === 1 ? 'exercițiu necesită' : 'exerciții necesită'} reluare.`}
                </Txt>
              </View>
            </View>

            <View style={styles.resultFacts}>
              <ResultFact label="Corecte" value={`${score}`} tone={c.successSoft} />
              <ResultFact label="De reluat" value={`${wrongAnswers.length}`} tone={c.dangerSoft} />
              <ResultFact label="Timp" value={mode === 'simulation' ? elapsedLabel : '—'} tone={c.sunnySoft} />
            </View>

            {wrongAnswers.length > 0 && (
              <View style={styles.review}>
                <Txt weight="bold" size={12} color={c.textMuted}>CE RELUĂM</Txt>
                {wrongAnswers.map(({ answer: itemAnswer, exercise: itemExercise }) => (
                  <View key={itemExercise.id} style={[styles.reviewRow, { borderBottomColor: c.border }]}>
                    <View style={[styles.reviewIcon, { backgroundColor: c.dangerSoft }]}>
                      <RezIcon name="mistakes" size={18} color={c.danger} />
                    </View>
                    <View style={styles.flex}>
                      <Txt numberOfLines={2} weight="semibold" size={13} color={c.text}>
                        {itemExercise.prompt}
                      </Txt>
                      <Txt size={11.5} color={c.textMuted}>
                        Ai răspuns: {itemAnswer.value || 'fără răspuns'} · Corect: {itemExercise.accepted[0]}
                      </Txt>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.resultActions}>
              <PrimaryAction title="Înapoi la Exersează" icon="back" onPress={onFinish} />
              <Press
                onPress={() => {
                  setIndex(0)
                  setScore(0)
                  setValue('')
                  setAnswer(null)
                  setIncorrect(false)
                  setSolutionVisible(false)
                  setConfirmSolution(false)
                  setHintVisible(false)
                  setTeacherVisible(false)
                  setTeacherReply('')
                  setAnswers([])
                  setAssistance('none')
                  startedAtRef.current = Date.now()
                  setElapsed(0)
                }}
                style={styles.textAction}
              >
                <RezIcon name="retry" size={17} color={c.accent} />
                <Txt weight="bold" size={13} color={c.accent}>Reia activitatea</Txt>
              </Press>
            </View>
          </ScrollView>
        </ScreenContent>
      </ScreenBackground>
    )
  }

  const check = () => {
    Keyboard.dismiss()
    const correct = answerMatches(exercise, value)
    if (mode === 'simulation') {
      const nextAnswers = [...answers, {
        exerciseId: exercise.id,
        value,
        correct,
        assistance: 'none' as const,
        prompt: exercise.prompt,
        competency: exercise.competency,
      }]
      const nextScore = score + (correct ? 1 : 0)
      const nextIndex = index + 1
      setAnswers(nextAnswers)
      setScore(nextScore)
      if (nextIndex === set.exercises.length) {
        saveCompletedAttempt(nextAnswers)
      }
      setIndex(nextIndex)
      setValue('')
      setHintVisible(false)
      setTeacherVisible(false)
      setTeacherReply('')
      return
    }
    if (!correct) {
      setIncorrect(true)
      return
    }
    setIncorrect(false)
    setAnswer({ value, correct: true })
    setAnswers((current) => [...current, {
      exerciseId: exercise.id,
      value,
      correct: true,
      assistance,
      prompt: exercise.prompt,
      competency: exercise.competency,
    }])
    setScore((current) => current + 1)
  }

  const revealSolution = () => {
    setAssistance('solution')
    setIncorrect(false)
    setSolutionVisible(true)
    setAnswer({ value, correct: false })
    setAnswers((current) => [...current, {
      exerciseId: exercise.id,
      value,
      correct: false,
      assistance: 'solution',
      prompt: exercise.prompt,
      competency: exercise.competency,
    }])
  }

  const next = () => {
    const nextIndex = index + 1
    if (nextIndex === set.exercises.length) {
      saveCompletedAttempt(answers)
    }
    setIndex(nextIndex)
    setValue('')
    setAnswer(null)
    setIncorrect(false)
    setSolutionVisible(false)
    setConfirmSolution(false)
    setHintVisible(false)
    setTeacherVisible(false)
    setTeacherReply('')
    setAssistance('none')
  }

  const askTeacher = async () => {
    setAssistance('ai')
    setTeacherVisible(true)
    if (teacherReply || teacherLoading) return
    setTeacherLoading(true)
    try {
      const reply = await followUpGuided(
        [{
          role: 'user',
          text: [
            `Exersez pentru ${exam === 'en' ? 'Evaluarea Națională' : `BAC${bacTrack ? `, profil ${BAC_TRACK_LABELS[bacTrack]}` : ''}`}.`,
            `Competență: ${exercise.competency}.`,
            `Enunț: ${exercise.prompt}`,
            `Răspunsul meu: ${value.trim() || 'Nu am scris încă nimic.'}`,
            'Ajută-mă pedagogic în română. Nu îmi da răspunsul final. Spune o observație scurtă și pune o întrebare care mă conduce la următorul pas.',
          ].join('\n'),
        }],
        undefined,
        `practice-${set.id}-${exercise.id}`,
      )
      setTeacherReply(reply)
    } catch {
      setTeacherReply('Nu pot răspunde acum. Folosește indiciul redactat și încearcă următorul pas.')
    } finally {
      setTeacherLoading(false)
    }
  }

  return (
    <ScreenBackground>
      <ContextHeader
        eyebrow={exam === 'en' ? 'EVALUARE NAȚIONALĂ' : `BAC${bacTrack ? ` · ${BAC_TRACK_LABELS[bacTrack]}` : ''}`}
        title={set.title}
        onBack={onBack}
        backLabel="Închide activitatea"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom}
      >
        <ScreenContent>
        <View style={styles.progressArea}>
          <View style={styles.progressHead}>
            <Txt weight="bold" size={11.5} color={c.text}>
              {index + 1} din {set.exercises.length}
            </Txt>
            <Txt numberOfLines={1} size={11.5} color={c.textMuted} style={styles.competency}>
              {exercise.competency}
            </Txt>
            {mode === 'simulation' && <Txt weight="bold" size={11.5} color={c.accent}>{elapsedLabel}</Txt>}
          </View>
          <ProgressMeter value={progress} />
        </View>

        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.page, answer && styles.pageReviewed]}
        >
        <View style={styles.problem}>
          <Txt
            weight="bold"
            size={10}
            color={c.accent}
            style={{ fontFamily: theme.font.mono, letterSpacing: 0.9 }}
          >
            PROBLEMA
          </Txt>
          <Txt style={[styles.prompt, { color: c.text, fontFamily: theme.font.display }]}>
            {exercise.prompt}
          </Txt>
        </View>

        {!answer ? (
          <>
            <View>
              <Txt weight="semibold" size={13} color={c.textMuted} style={styles.answerLabel}>
                {exercise.answerLabel}
              </Txt>
              <TextInput
                value={value}
                onChangeText={(nextValue) => {
                  setValue(nextValue)
                  if (incorrect) setIncorrect(false)
                }}
                placeholder="Scrie răspunsul"
                placeholderTextColor={c.textFaint}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0', color: c.text },
                ]}
              />
            </View>
            {mode !== 'simulation' && (
              <>
                <View style={styles.helpRow}>
                  <Press onPress={() => {
                    setAssistance((currentAssistance) => currentAssistance === 'ai' ? 'ai' : 'hint')
                    setHintVisible((visible) => !visible)
                  }} pressDepth={2.5} style={[styles.helpAction, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}>
                    <RezIcon name="spark" size={17} color={c.text} accent={c.bubblyRed} />
                    <Txt weight="bold" size={13} color={c.text}>Indiciu</Txt>
                  </Press>
                  <Press onPress={askTeacher} pressDepth={2.5} style={[styles.helpAction, { backgroundColor: c.successSoft, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }]}>
                    <RezIcon name="teacher" size={17} color={c.text} accent={c.bubblyRed} />
                    <Txt weight="bold" size={12.5} color={c.text}>Cere ajutor AI</Txt>
                  </Press>
                </View>
                {hintVisible && (
                  <View style={[styles.hint, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}>
                    <RezIcon name="spark" size={20} color={c.text} accent={c.bubblyRed} />
                    <Txt size={13.5} color={c.text} style={styles.flex}>{exercise.hint}</Txt>
                  </View>
                )}
                {teacherVisible && (
                  <TeacherHelpPanel
                    loading={teacherLoading}
                    message={teacherReply || 'Analizez exercițiul și răspunsul tău.'}
                    onHint={() => {
                      setAssistance((currentAssistance) => currentAssistance === 'ai' ? 'ai' : 'hint')
                      setHintVisible(true)
                    }}
                    onMethod={() => {
                      setAssistance((currentAssistance) => currentAssistance === 'ai' ? 'ai' : 'hint')
                      setHintVisible(true)
                    }}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <View style={styles.feedback}>
            <View style={[styles.feedbackHead, { backgroundColor: answer.correct ? c.successSoft : c.sunnySoft, borderColor: answer.correct ? c.bubblyGreenDark : c.bubblyYellowDark, borderBottomColor: answer.correct ? c.bubblyGreenDark : c.bubblyYellowDark }]}>
              <RezIcon
                name={answer.correct ? 'check' : 'learn'}
                size={22}
                color={answer.correct ? c.bubblyGreen : c.text}
                accent={answer.correct ? c.bubblyGreen : c.sunny}
              />
              <Txt weight="bold" size={16} color={answer.correct ? c.bubblyGreenDark : c.text}>
                {answer.correct ? 'Corect!' : 'Rezolvarea cerută'}
              </Txt>
            </View>
            {solutionVisible ? (
              <>
                <Txt weight="bold" size={11.5} color={c.textFaint}>EXPLICAȚIE</Txt>
                <Txt size={14.5} color={c.text} style={styles.explanation}>{exercise.explanation}</Txt>
              </>
            ) : (
              <Press onPress={() => setSolutionVisible(true)} style={styles.methodAction}>
                <RezIcon name="learn" size={17} color={c.accent} accent={c.accent} />
                <Txt weight="bold" size={13} color={c.accent}>Vezi metoda</Txt>
              </Press>
            )}
          </View>
        )}

        {incorrect && !answer && (
          <View style={[styles.incorrectFeedback, { backgroundColor: c.dangerSoft }]}>
            <RezIcon name="retry" size={20} color={c.danger} accent={c.danger} />
            <View style={styles.flex}>
              <Txt weight="bold" size={14} color={c.text}>Nu încă. Mai încearcă.</Txt>
              <Txt size={12.5} color={c.textMuted}>Soluția rămâne ascunsă; răspunsul poate fi corectat.</Txt>
            </View>
          </View>
        )}
        </ScrollView>

        <View style={[styles.bottomBar, { borderTopColor: c.cardEdge, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {incorrect && !answer && mode !== 'simulation' && (
            <Press onPress={() => setConfirmSolution(true)} style={styles.giveUpAction}>
              <Txt weight="bold" size={12.5} color={c.textMuted}>Renunț și văd rezolvarea</Txt>
            </Press>
          )}
          <Press
            onPress={answer ? next : check}
            disabled={!answer && !value.trim()}
            pressDepth={4}
            style={[
              styles.primary,
              answer || value.trim()
                ? { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }
                : { backgroundColor: c.surfaceAlt, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' },
            ]}
          >
            <Txt weight="bold" size={15} color={answer || value.trim() ? '#FFFFFF' : c.textFaint}>
              {answer
                ? index + 1 === set.exercises.length ? 'Vezi rezultatul' : 'Exercițiul următor'
                : mode === 'simulation'
                  ? index + 1 === set.exercises.length ? 'Finalizează simularea' : 'Salvează și continuă'
                  : 'Verifică răspunsul'}
            </Txt>
            {(answer || !!value.trim()) && <RezIcon name={answer ? 'arrow' : 'check'} size={19} color="#FFFFFF" />}
          </Press>
        </View>
        </ScreenContent>
      </KeyboardAvoidingView>
      <ConfirmDialog
        open={confirmSolution}
        title="Vrei să vezi rezolvarea?"
        message="Soluția și răspunsul vor deveni vizibile, iar exercițiul va fi salvat ca încercare asistată."
        confirmLabel="Arată rezolvarea"
        cancelLabel="Mai încerc"
        onClose={() => setConfirmSolution(false)}
        onConfirm={revealSolution}
      />
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', paddingBottom: 18, paddingTop: 10 },
  pageReviewed: { justifyContent: 'flex-start' },
  progressArea: { gap: 7, paddingBottom: 3 },
  progressHead: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  competency: { flex: 1, textAlign: 'center' },
  progressTrack: { marginTop: 8 },
  problem: { justifyContent: 'center', minHeight: 126, paddingVertical: 14 },
  prompt: { fontSize: 21, letterSpacing: -0.4, lineHeight: 28, marginTop: 7 },
  answerLabel: { marginBottom: 7 },
  input: { borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, fontSize: 17.5, minHeight: 62, paddingHorizontal: 18 },
  hintAction: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 48 },
  hint: { alignItems: 'center', borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, flexDirection: 'row', gap: 11, marginVertical: 10, padding: 16 },
  helpRow: { flexDirection: 'row', gap: 9, marginVertical: 9 },
  helpAction: { alignItems: 'center', borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 58, paddingHorizontal: 12 },
  primary: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: 20,
  },
  bottomBar: { borderTopWidth: 3, paddingTop: 10 },
  feedback: { gap: 13, paddingBottom: 8 },
  feedbackHead: { alignItems: 'center', borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, flexDirection: 'row', gap: 12, padding: 16 },
  explanation: { lineHeight: 22 },
  methodAction: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 46 },
  incorrectFeedback: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 11, marginTop: 10, padding: 14 },
  giveUpAction: { alignItems: 'center', justifyContent: 'center', minHeight: 38 },
  resultPage: { gap: 15, paddingBottom: 28, paddingTop: 8 },
  resultHero: { alignItems: 'center', borderRadius: 28, borderWidth: 3, borderBottomWidth: 9, flexDirection: 'row', gap: 20, padding: 24 },
  score: { color: '#FFFFFF', fontSize: 44, letterSpacing: -1.5, lineHeight: 50 },
  resultHeroCopy: { flex: 1, gap: 4 },
  resultFacts: { flexDirection: 'row', gap: 9 },
  resultFact: { borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, flex: 1, padding: 16 },
  resultFactValue: { fontSize: 22, marginTop: 3 },
  review: { gap: 5, marginTop: 4 },
  reviewRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 11, minHeight: 72, paddingVertical: 10 },
  reviewIcon: { alignItems: 'center', borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, height: 48, justifyContent: 'center', width: 48 },
  resultActions: { gap: 8, marginTop: 6 },
  textAction: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 48 },
})

function ResultFact({ label, value, tone }: { label: string; value: string; tone: string }) {
  const { theme } = useTheme()
  return (
    <View style={[styles.resultFact, { backgroundColor: tone }]}>
      <Txt size={10.5} color={theme.colors.textMuted}>{label}</Txt>
      <Txt weight="bold" color={theme.colors.text} style={styles.resultFactValue}>{value}</Txt>
    </View>
  )
}
