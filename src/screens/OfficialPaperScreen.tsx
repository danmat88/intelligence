import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeOfficialPaper, OfficialExercise } from '../archive/content'
import {
  findOpenOfficialAttempt,
  saveOfficialAttempt,
  type OfficialPaperMode,
} from '../archive/store'
import ContextHeader from '../components/ui/ContextHeader'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import Txt from '../components/ui/Txt'
import OfficialChoiceGrid from '../features/official/OfficialChoiceGrid'
import OfficialSolution from '../features/official/OfficialSolution'
import TeacherHelpPanel from '../features/learning/TeacherHelpPanel'
import OfficialFigure from '../features/official/OfficialFigure'
import ProgressMeter from '../components/ui/ProgressMeter'
import { followUp } from '../solve/solve'
import { useTheme } from '../theme/ThemeProvider'

type Props = {
  item: NativeOfficialPaper
  initialMode: OfficialPaperMode
  onBack: () => void
}

const modeCopy: Record<OfficialPaperMode, { title: string; detail: string }> = {
  study: {
    title: 'Studiază',
    detail: 'Parcurgi exercițiile și vezi metoda redactată pas cu pas.',
  },
  guided: {
    title: 'Ghidat',
    detail: 'Rezolvi singur, apoi primești indicii și explicații în context.',
  },
  simulation: {
    title: 'Simulare',
    detail: 'Lucrezi cronometrat, fără indicii și fără răspunsuri afișate.',
  },
}

function flattenExercises(paper: NativeOfficialPaper) {
  return paper.sections.flatMap((section) =>
    section.exercises.map((exercise) => ({ section, exercise })),
  )
}

export default function OfficialPaperScreen({ item, initialMode, onBack }: Props) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors
  const items = useMemo(() => flattenExercises(item), [item])
  const [mode, setMode] = useState<OfficialPaperMode>(initialMode)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)
  const [solutionVisible, setSolutionVisible] = useState(initialMode === 'study')
  const [teacherVisible, setTeacherVisible] = useState(false)
  const [teacherReply, setTeacherReply] = useState('')
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [teacherError, setTeacherError] = useState('')
  const [finished, setFinished] = useState(false)
  const [submitConfirmVisible, setSubmitConfirmVisible] = useState(false)
  const startedAtRef = useRef(Date.now())
  const attemptIdRef = useRef(`${item.id}-${Date.now()}`)
  const current = items[index]

  useEffect(() => {
    findOpenOfficialAttempt(item.id, item.profile, initialMode)
      .then((attempt) => {
        if (!attempt) return
        attemptIdRef.current = attempt.id
        startedAtRef.current = Date.now() - attempt.elapsedSeconds * 1000
        setElapsed(attempt.elapsedSeconds)
        setAnswers(attempt.answers ?? {})
        setIndex(Math.min(attempt.exerciseIndex ?? 0, Math.max(items.length - 1, 0)))
        setMode(attempt.mode)
      })
      .catch(() => {})
  }, [initialMode, item.id, item.profile, items.length])

  useEffect(() => {
    if (finished) return
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      1000,
    )
    return () => clearInterval(timer)
  }, [finished, mode])

  useEffect(() => {
    const persist = () =>
      saveOfficialAttempt({
        id: attemptIdRef.current,
        packageId: item.id,
        exam: item.exam,
        year: item.year,
        session: item.session,
        profile: item.profile,
        mode,
        startedAt: startedAtRef.current,
        elapsedSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
        answers,
        exerciseIndex: index,
      }).catch(() => {})
    const timer = setInterval(persist, 15_000)
    return () => {
      clearInterval(timer)
      persist()
    }
  }, [answers, index, item, mode])

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(items.length - 1, next)))
    setHintVisible(false)
    setSolutionVisible(mode === 'study')
    setTeacherVisible(false)
    setTeacherReply('')
    setTeacherError('')
    setSubmitConfirmVisible(false)
  }

  const score = useMemo(() => {
    const earned = items.reduce((total, { exercise }) => {
      if (!exercise.correctOption) return total
      return answers[exercise.id] === exercise.correctOption ? total + exercise.points : total
    }, item.pointsFromOffice)
    const automaticallyScored = items.reduce(
      (total, { exercise }) => total + (exercise.correctOption ? exercise.points : 0),
      item.pointsFromOffice,
    )
    return { earned, automaticallyScored }
  }, [answers, item.pointsFromOffice, items])

  const finish = () => {
    const unanswered = items.filter(({ exercise: itemExercise }) => !answers[itemExercise.id]?.trim()).length
    if (mode === 'simulation' && unanswered > 0 && !submitConfirmVisible) {
      setSubmitConfirmVisible(true)
      return
    }
    setFinished(true)
    saveOfficialAttempt({
      id: attemptIdRef.current,
      packageId: item.id,
      exam: item.exam,
      year: item.year,
      session: item.session,
      profile: item.profile,
      mode,
      startedAt: startedAtRef.current,
      completedAt: Date.now(),
      elapsedSeconds: elapsed,
      answers,
      exerciseIndex: index,
      score: score.earned,
      maxScore: score.automaticallyScored,
    }).catch(() => {})
  }

  const time = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60)
    .toString()
    .padStart(2, '0')}`

  if (finished) {
    return (
      <ScreenBackground>
        <ContextHeader
          eyebrow={`${item.year} · ${modeCopy[mode].title.toUpperCase()}`}
          title="Rezultatul lucrării"
          onBack={onBack}
          backLabel="Închide rezultatul"
        />
        <ScreenContent style={styles.resultPage}>
          <View style={[styles.resultCard, { backgroundColor: c.chalkDark, borderColor: '#0A2926', borderBottomColor: '#071F1D' }]}>
            <Txt size={11} color="#DDF3E6" style={{ letterSpacing: 0.8 }}>PUNCTAJ VERIFICAT AUTOMAT</Txt>
            <Txt style={[styles.resultScore, { fontFamily: theme.font.display }]}>
              {score.earned}/{score.automaticallyScored}
            </Txt>
            <Txt size={13} color="#DDF3E6" style={styles.resultCopy}>
              Sunt incluse punctele din oficiu și exercițiile cu alegere multiplă.
              Exercițiile cu redactare se verifică separat, pe barem.
            </Txt>
          </View>
          <Press
            onPress={() => { setFinished(false); setMode('study'); setSolutionVisible(true) }}
            pressDepth={4}
            style={[styles.primary, { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }]}
          >
            <RezIcon name="learn" size={20} color="#FFFFFF" accent={c.bubblyYellow} />
            <Txt weight="bold" size={15} color="#FFFFFF">Revizuiește rezolvările</Txt>
          </Press>
        </ScreenContent>
      </ScreenBackground>
    )
  }

  const { section, exercise } = current
  const answer = answers[exercise.id] ?? ''
  const isChoice = !!exercise.options?.length
  const showHelp = mode !== 'simulation'
  const askTeacher = async () => {
    setTeacherVisible(true)
    if (teacherReply || teacherLoading) return
    setTeacherLoading(true)
    setTeacherError('')
    try {
      const reply = await followUp(
        [{
          role: 'user',
          text: [
            `Lucrez ${item.title}, ${item.year}, ${item.session}.`,
            `${section.title}, exercițiul ${exercise.number}, ${exercise.points} puncte.`,
            `Enunț: ${exercise.prompt}`,
            `Competență: ${exercise.competency}.`,
            `Răspunsul meu: ${answer.trim() || 'Nu am scris încă nimic.'}`,
            'Ajută-mă în română, pedagogic. Nu da răspunsul final. Spune o singură observație și pune-mi o întrebare care mă conduce la pasul următor.',
          ].join('\n'),
        }],
        undefined,
        `${item.id}-${exercise.id}`,
      )
      setTeacherReply(reply)
    } catch {
      setTeacherError('Profu’ nu a putut răspunde acum. Indiciul redactat rămâne disponibil.')
    } finally {
      setTeacherLoading(false)
    }
  }
  return (
    <ScreenBackground>
      <ContextHeader
        eyebrow={`${modeCopy[mode].title.toUpperCase()} · ${item.year}`}
        title={`Exercițiul ${exercise.number}`}
        onBack={onBack}
        backLabel="Înapoi la subiecte"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={-insets.bottom}
      >
        <ScreenContent>
        <View style={styles.progressRow}>
          <Txt weight="bold" size={11.5} color={c.textMuted}>{index + 1} din {items.length}</Txt>
          <View style={styles.progressTrack}>
            <ProgressMeter value={(index + 1) / items.length} />
          </View>
          {mode === 'simulation' && (
            <Txt weight="bold" size={11.5} color={c.text}>{time}</Txt>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.exercisePage,
            (solutionVisible || teacherVisible || hintVisible) && styles.exercisePageExpanded,
          ]}
        >
          <View style={styles.exerciseMeta}>
            <View style={[styles.points, { backgroundColor: c.sunnySoft }]}>
              <Txt weight="bold" size={11} color={c.text}>{exercise.points} puncte</Txt>
            </View>
            <Txt size={11} color={c.textMuted}>{exercise.competency}</Txt>
          </View>

          <Txt style={[styles.prompt, { color: c.text, fontFamily: theme.font.serif }]}>
            {exercise.prompt}
          </Txt>

          {exercise.figure && exercise.figureDescription ? (
            <OfficialFigure figure={exercise.figure} description={exercise.figureDescription} />
          ) : exercise.figureDescription ? (
            <View style={[styles.figure, { backgroundColor: c.chalkDark }]}>
              <RezIcon name="workspace" size={22} color="#FFFFFF" accent={c.sunny} />
              <Txt size={12.5} color="#FFFFFF" style={styles.figureCopy}>
                {exercise.figureDescription}
              </Txt>
            </View>
          ) : null}

          {isChoice ? (
            <OfficialChoiceGrid
              exercise={exercise}
              value={answer}
              revealAnswer={mode === 'study' || solutionVisible}
              onChange={(value) => setAnswers((currentAnswers) => ({
                ...currentAnswers,
                [exercise.id]: value,
              }))}
            />
          ) : (
            <TextInput
              value={answer}
              onChangeText={(value) => setAnswers((currentAnswers) => ({
                ...currentAnswers,
                [exercise.id]: value,
              }))}
              multiline
              placeholder="Scrie răspunsul și calculele tale…"
              placeholderTextColor={c.textFaint}
              style={[
                styles.workInput,
                { backgroundColor: c.surface, borderColor: c.border, color: c.text },
              ]}
            />
          )}

          {showHelp && (
            <View style={styles.helpActions}>
              <Press
                onPress={() => setHintVisible((visible) => !visible)}
                style={[styles.secondary, { backgroundColor: c.sunnySoft }]}
              >
                <RezIcon name="spark" size={17} color={c.text} accent={c.accent} />
                <Txt weight="bold" size={12.5} color={c.text}>Indiciu</Txt>
              </Press>
              <Press
                onPress={askTeacher}
                style={[styles.secondary, { backgroundColor: c.successSoft }]}
              >
                <RezIcon name="teacher" size={17} color={c.text} accent={c.accent} />
                <Txt weight="bold" size={12} color={c.text}>Întreabă-l pe Profu’</Txt>
              </Press>
            </View>
          )}

          {teacherVisible && (
            <TeacherHelpPanel
              loading={teacherLoading}
              message={teacherReply || teacherError || teacherMessage(exercise, answer)}
              onHint={() => setHintVisible(true)}
              onMethod={() => setSolutionVisible(true)}
            />
          )}

          {hintVisible && (
            <View style={[styles.helpBox, { backgroundColor: c.sunnySoft }]}>
              <Txt weight="bold" size={11} color={c.text}>INDICIU</Txt>
              <Txt size={13} color={c.text} style={styles.helpCopy}>{exercise.hint}</Txt>
            </View>
          )}

          {showHelp && (
            <Press
              onPress={() => setSolutionVisible((visible) => !visible)}
              style={[styles.solutionToggle, { borderColor: c.border }]}
            >
              <Txt weight="bold" size={12.5} color={c.accent}>
                {solutionVisible ? 'Ascunde rezolvarea' : 'Vezi rezolvarea redactată'}
              </Txt>
              <RezIcon name={solutionVisible ? 'back' : 'chevron'} size={16} color={c.accent} />
            </Press>
          )}

          {solutionVisible && (
            <OfficialSolution exercise={exercise} />
          )}
        </ScrollView>

        <View style={[styles.bottom, { borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {submitConfirmVisible && mode === 'simulation' && (
            <View style={[styles.submitWarning, { backgroundColor: c.sunnySoft }]}>
              <Txt size={11.5} color={c.text}>
                Ai exerciții fără răspuns. Apasă din nou „Finalizează” dacă vrei să predai.
              </Txt>
            </View>
          )}
          <Press
            disabled={index === 0}
            onPress={() => goTo(index - 1)}
            style={[styles.navButton, { backgroundColor: index === 0 ? c.surfaceAlt : c.surface }]}
          >
            <RezIcon name="back" size={18} color={index === 0 ? c.textFaint : c.text} />
          </Press>
          {index === items.length - 1 ? (
            <Press onPress={finish} style={[styles.finishButton, { backgroundColor: c.accent }]}>
              <Txt weight="bold" size={13.5} color="#FFFFFF">Finalizează</Txt>
              <RezIcon name="check" size={18} color="#FFFFFF" />
            </Press>
          ) : (
            <Press onPress={() => goTo(index + 1)} style={[styles.finishButton, { backgroundColor: c.text }]}>
              <Txt weight="bold" size={13.5} color="#FFFFFF">Exercițiul următor</Txt>
              <RezIcon name="forward" size={18} color="#FFFFFF" />
            </Press>
          )}
        </View>
        </ScreenContent>
      </KeyboardAvoidingView>
    </ScreenBackground>
  )
}

function teacherMessage(exercise: OfficialExercise, answer: string) {
  if (!answer.trim()) {
    return `Începe prin a identifica ideea „${exercise.competency}”. Nu calcula încă totul. Ce operație sau formulă se potrivește enunțului?`
  }
  if (exercise.correctOption && answer === exercise.correctOption) {
    return 'Alegerea ta este corectă. Înainte să mergi mai departe, explică în minte de ce celelalte variante nu se potrivesc.'
  }
  if (exercise.correctOption) {
    return 'Răspunsul ales nu se potrivește. Nu îl schimb eu în locul tău: verifică ordinea operațiilor și compară rezultatul cu fiecare variantă.'
  }
  return 'Ai început bine: păstrează calculele pe rânduri separate. Verifică acum dacă fiecare pas folosește toate datele din enunț.'
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingBottom: 8 },
  progressTrack: { flex: 1 },
  exercisePage: { flexGrow: 1, justifyContent: 'center', paddingBottom: 22, paddingTop: 9 },
  exercisePageExpanded: { justifyContent: 'flex-start' },
  exerciseMeta: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  points: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  prompt: { fontSize: 17, lineHeight: 24, marginTop: 11 },
  figure: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 10, marginTop: 16, padding: 15 },
  figureCopy: { flex: 1, lineHeight: 18 },
  workInput: { borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, fontSize: 16, lineHeight: 24, marginTop: 15, minHeight: 140, padding: 16, textAlignVertical: 'top' },
  helpActions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  secondary: { alignItems: 'center', borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, flex: 1, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 56, paddingHorizontal: 12 },
  helpBox: { borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, marginTop: 12, padding: 18 },
  helpCopy: { lineHeight: 20, marginTop: 5 },
  solutionToggle: { alignItems: 'center', borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, minHeight: 64, paddingHorizontal: 18 },
  bottom: { borderTopWidth: 1.8, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 10 },
  submitWarning: { borderRadius: 16, borderWidth: 3, borderBottomWidth: 5, padding: 14, width: '100%' },
  navButton: { alignItems: 'center', borderRadius: 20, borderWidth: 3, borderBottomWidth: 6, height: 64, justifyContent: 'center', width: 64 },
  finishButton: { alignItems: 'center', borderRadius: 22, borderWidth: 3, borderBottomWidth: 8, flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 64 },
  primary: { alignItems: 'center', borderRadius: 24, borderWidth: 3, borderBottomWidth: 8, flexDirection: 'row', gap: 12, justifyContent: 'center', minHeight: 72 },
  resultPage: { gap: 15, justifyContent: 'center', paddingBottom: 50 },
  resultCard: { borderRadius: 26, borderWidth: 3, borderBottomWidth: 8, padding: 26 },
  resultScore: { color: '#FFFFFF', fontSize: 48, letterSpacing: -2, lineHeight: 56, marginTop: 7 },
  resultCopy: { lineHeight: 19, marginTop: 5 },
})
