import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import AppHeader from '../components/ui/AppHeader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import SegmentedControl from '../components/ui/SegmentedControl'
import Txt from '../components/ui/Txt'
import {
  generateGeneralPracticeExercise,
  generalPracticeAnswerMatches,
  type GeneralPracticeExercise,
  type GeneralPracticeMode,
} from '../practice/general'
import { savePracticeAttempt, type PracticeAssistance } from '../practice/store'
import { useTheme } from '../theme/ThemeProvider'

type Feedback = 'correct' | 'incorrect' | null

export default function GeneralPracticeScreen({
  onOpenSettings,
}: {
  onOpenSettings: () => void
}) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const c = theme.colors
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<GeneralPracticeMode>('guided')
  const [exercise, setExercise] = useState<GeneralPracticeExercise | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [attempts, setAttempts] = useState(0)
  const [hintCount, setHintCount] = useState(0)
  const [solutionVisible, setSolutionVisible] = useState(false)
  const [confirmSolution, setConfirmSolution] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const startedAtRef = useRef(Date.now())
  const savedRef = useRef(false)

  useEffect(() => () => requestRef.current?.abort(), [])

  const clearWorkState = () => {
    setAnswer('')
    setFeedback(null)
    setAttempts(0)
    setHintCount(0)
    setSolutionVisible(false)
    setConfirmSolution(false)
  }

  const start = async () => {
    const requestedTopic = topic.trim()
    if (!requestedTopic || loading) return
    Keyboard.dismiss()
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)
    clearWorkState()
    try {
      const id = `general_${Date.now()}`
      const next = await generateGeneralPracticeExercise(requestedTopic, mode, controller.signal, id)
      if (!controller.signal.aborted) {
        startedAtRef.current = Date.now()
        savedRef.current = false
        setExercise(next)
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setExercise(null)
        setError(cause instanceof Error && /alege/i.test(cause.message)
          ? cause.message
          : 'Nu am putut crea exercițiul. Verifică internetul și încearcă din nou.')
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  const changeSetup = () => {
    requestRef.current?.abort()
    requestRef.current = null
    setExercise(null)
    setLoading(false)
    setError(null)
    clearWorkState()
  }

  const check = () => {
    if (!exercise || !answer.trim()) return
    Keyboard.dismiss()
    const correct = generalPracticeAnswerMatches(exercise, answer)
    setAttempts((current) => current + 1)
    setFeedback(correct ? 'correct' : 'incorrect')
    if (correct) saveResult(exercise, true, hintCount > 0 ? 'hint' : 'none')
  }

  const saveResult = (
    currentExercise: GeneralPracticeExercise,
    correct: boolean,
    assistance: PracticeAssistance,
  ) => {
    if (!user || savedRef.current) return
    savedRef.current = true
    const completedAt = Date.now()
    savePracticeAttempt(user.id, {
      id: currentExercise.id,
      setId: currentExercise.id,
      exam: null,
      topic: currentExercise.topic,
      score: correct ? 1 : 0,
      total: 1,
      startedAt: startedAtRef.current,
      completedAt,
      mode: 'practice',
      elapsedSeconds: Math.max(0, Math.floor((completedAt - startedAtRef.current) / 1000)),
      answers: [{
        exerciseId: currentExercise.id,
        value: answer.trim(),
        correct,
        assistance,
        prompt: currentExercise.prompt,
        competency: currentExercise.competency,
      }],
    }).catch(() => {
      // A transient persistence failure may be retried by a later terminal
      // action in the same session; it must never change the learning UI.
      savedRef.current = false
    })
  }

  const showNextHint = () => {
    if (!exercise || hintCount >= exercise.hints.length) return
    setHintCount((current) => current + 1)
  }

  const requestSolution = () => {
    if (feedback === 'correct') setSolutionVisible(true)
    else setConfirmSolution(true)
  }

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <ScreenContent>
        {!exercise && !loading ? (
          <ScrollView
            contentContainerStyle={styles.setupPage}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeading
              eyebrow="EXERSEAZĂ"
              title="Alege ce vrei să exersezi"
              description="Primești câte un exercițiu. Răspunsul și rezolvarea rămân ascunse până când le ceri explicit."
            />

            <View style={[styles.inputCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <RezIcon name="practice" size={22} color={c.text} accent={c.accent} />
              <TextInput
                value={topic}
                onChangeText={(value) => {
                  setTopic(value.slice(0, 120))
                  setError(null)
                }}
                placeholder="De exemplu: ecuații, procente, derivate…"
                placeholderTextColor={c.textFaint}
                returnKeyType="done"
                onSubmitEditing={() => void start()}
                style={[styles.input, { color: c.text, fontFamily: theme.font.regular }]}
                accessibilityLabel="Subiectul pe care vrei să îl exersezi"
              />
            </View>

            <View style={styles.modeSection}>
              <Txt weight="bold" size={11} color={c.textMuted}>CUM VREI SĂ LUCREZI?</Txt>
              <SegmentedControl
                value={mode}
                accessibilityLabel="Modul de exersare"
                segments={[
                  { value: 'guided', label: 'Cu indicii' },
                  { value: 'independent', label: 'Fără ajutor' },
                ]}
                onChange={setMode}
              />
              <View style={[styles.modeExplanation, { backgroundColor: c.surfaceAlt }]}>
                <RezIcon
                  name={mode === 'guided' ? 'teacher' : 'simulate'}
                  size={18}
                  color={c.text}
                  accent={c.accent}
                />
                <Txt size={12.5} color={c.textMuted} style={styles.flex}>
                  {mode === 'guided'
                    ? 'Poți cere indicii progresive. Niciun indiciu nu conține răspunsul final.'
                    : 'Lucrezi singur. Nu apar indicii, răspuns sau rezolvare înainte de verificare.'}
                </Txt>
              </View>
            </View>

            {!!error && (
              <View style={[styles.error, { backgroundColor: c.dangerSoft }]}>
                <RezIcon name="alert" size={18} color={c.danger} accent={c.danger} />
                <Txt size={12.5} color={c.danger} style={styles.flex}>{error}</Txt>
              </View>
            )}

            <Press
              disabled={!topic.trim()}
              onPress={() => void start()}
              pressDepth={4}
              style={[
                styles.primary,
                topic.trim()
                  ? { backgroundColor: c.accent, borderColor: c.accent }
                  : { backgroundColor: c.surfaceAlt, borderColor: c.border },
              ]}
            >
              <Txt weight="bold" size={15} color={topic.trim() ? '#FFFFFF' : c.textFaint}>
                Creează exercițiul
              </Txt>
              <RezIcon name="arrow" size={19} color={topic.trim() ? '#FFFFFF' : c.textFaint} />
            </Press>
          </ScrollView>
        ) : loading ? (
          <View style={styles.loadingPage}>
            <View style={[styles.loadingIcon, { backgroundColor: c.surface }]}>
              <ActivityIndicator size="large" color={c.accent} />
            </View>
            <Txt weight="bold" size={18} color={c.text}>Pregătesc exercițiul…</Txt>
            <Txt size={13} color={c.textMuted} style={styles.loadingCopy}>
              Verific să aibă enunț complet și un răspuns care poate fi evaluat.
            </Txt>
            <Press onPress={changeSetup} style={styles.cancelAction}>
              <Txt weight="bold" size={13} color={c.accent}>Anulează</Txt>
            </Press>
          </View>
        ) : exercise ? (
          <View style={styles.session}>
            <View style={styles.sessionHeader}>
              <View style={styles.flex}>
                <Txt weight="bold" size={10.5} color={c.accent}>EXERCIȚIU · {mode === 'guided' ? 'CU INDICII' : 'FĂRĂ AJUTOR'}</Txt>
                <Txt numberOfLines={1} style={[styles.sessionTitle, { color: c.text, fontFamily: theme.font.display }]}>
                  {exercise.topic}
                </Txt>
              </View>
              <Press onPress={changeSetup} hitSlop={8} style={[styles.changeButton, { backgroundColor: c.surface }]}>
                <RezIcon name="settings" size={17} color={c.textMuted} />
                <Txt weight="bold" size={11.5} color={c.textMuted}>Schimbă</Txt>
              </Press>
            </View>

            <ScrollView
              contentContainerStyle={styles.exercisePage}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.lockedNotice, { backgroundColor: c.successSoft }]}>
                <RezIcon name="shield" size={16} color={c.success} accent={c.success} />
                <Txt weight="semibold" size={11.5} color={c.text} style={styles.flex}>
                  Soluția este ascunsă. Apare numai dacă alegi să o vezi.
                </Txt>
              </View>

              <View style={[styles.problemCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Txt weight="bold" size={10.5} color={c.textMuted}>{exercise.competency.toUpperCase()}</Txt>
                <Txt style={[styles.prompt, { color: c.text, fontFamily: theme.font.serif }]}>
                  {exercise.prompt}
                </Txt>
              </View>

              <View style={styles.answerArea}>
                <Txt weight="semibold" size={12.5} color={c.textMuted}>{exercise.answerLabel}</Txt>
                <TextInput
                  value={answer}
                  editable={feedback !== 'correct' && !solutionVisible}
                  onChangeText={(value) => {
                    setAnswer(value)
                    if (feedback === 'incorrect') setFeedback(null)
                  }}
                  placeholder="Scrie răspunsul tău"
                  placeholderTextColor={c.textFaint}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={check}
                  style={[
                    styles.answerInput,
                    {
                      backgroundColor: c.surface,
                      borderColor: feedback === 'correct' ? c.success : feedback === 'incorrect' ? c.danger : c.border,
                      color: c.text,
                      fontFamily: theme.font.regular,
                    },
                  ]}
                />
              </View>

              {feedback === 'correct' && (
                <View style={[styles.feedback, { backgroundColor: c.successSoft }]}>
                  <RezIcon name="check" size={21} color={c.success} accent={c.success} />
                  <View style={styles.flex}>
                    <Txt weight="bold" size={14.5} color={c.text}>Corect.</Txt>
                    <Txt size={12.5} color={c.textMuted}>Ai ajuns la răspuns fără să îți afișăm soluția.</Txt>
                  </View>
                </View>
              )}

              {feedback === 'incorrect' && (
                <View style={[styles.feedback, { backgroundColor: c.dangerSoft }]}>
                  <RezIcon name="retry" size={21} color={c.danger} accent={c.danger} />
                  <View style={styles.flex}>
                    <Txt weight="bold" size={14.5} color={c.text}>Nu încă. Mai încearcă.</Txt>
                    <Txt size={12.5} color={c.textMuted}>Soluția rămâne ascunsă. Îți poți corecta răspunsul.</Txt>
                  </View>
                </View>
              )}

              {mode === 'guided' && hintCount > 0 && (
                <View style={styles.hints}>
                  {exercise.hints.slice(0, hintCount).map((hint, index) => (
                    <View key={`${exercise.id}-hint-${index}`} style={[styles.hint, { backgroundColor: c.sunnySoft }]}>
                      <View style={[styles.hintNumber, { backgroundColor: c.sunny }]}>
                        <Txt weight="bold" size={11} color={c.text}>{index + 1}</Txt>
                      </View>
                      <Txt size={13} color={c.text} style={styles.flex}>{hint}</Txt>
                    </View>
                  ))}
                </View>
              )}

              {solutionVisible && (
                <View style={[styles.solution, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={styles.solutionHeader}>
                    <RezIcon name="learn" size={20} color={c.accent} accent={c.accent} />
                    <Txt weight="bold" size={15} color={c.text}>Rezolvarea</Txt>
                  </View>
                  {exercise.solutionSteps.map((step, index) => (
                    <View key={`${exercise.id}-step-${index}`} style={styles.solutionStep}>
                      <Txt weight="bold" size={11.5} color={c.accent}>{index + 1}.</Txt>
                      <Txt size={13.5} color={c.text} style={styles.flex}>{step}</Txt>
                    </View>
                  ))}
                  <View style={[styles.finalAnswer, { backgroundColor: c.successSoft }]}>
                    <Txt weight="bold" size={12} color={c.textMuted}>Răspuns final</Txt>
                    <Txt weight="bold" size={16} color={c.text}>{exercise.finalAnswer}</Txt>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.actions, { borderTopColor: c.border }]}>
              {feedback === 'correct' || solutionVisible ? (
                <>
                  {!solutionVisible && (
                    <Press onPress={requestSolution} style={styles.secondaryAction}>
                      <RezIcon name="learn" size={17} color={c.accent} accent={c.accent} />
                      <Txt weight="bold" size={12.5} color={c.accent}>Vezi metoda</Txt>
                    </Press>
                  )}
                  <Press
                    onPress={() => void start()}
                    pressDepth={4}
                    style={[styles.primary, { backgroundColor: c.accent, borderColor: c.accent }]}
                  >
                    <Txt weight="bold" size={15} color="#FFFFFF">Alt exercițiu</Txt>
                    <RezIcon name="arrow" size={19} color="#FFFFFF" />
                  </Press>
                </>
              ) : (
                <>
                  <View style={styles.helpActions}>
                    {mode === 'guided' && hintCount < exercise.hints.length && (
                      <Press onPress={showNextHint} style={styles.secondaryAction}>
                        <RezIcon name="spark" size={17} color={c.accent} accent={c.sunny} />
                        <Txt weight="bold" size={12.5} color={c.accent}>
                          {hintCount === 0 ? 'Dă-mi un indiciu' : 'Încă un indiciu'}
                        </Txt>
                      </Press>
                    )}
                    {attempts > 0 && (
                      <Press onPress={requestSolution} style={styles.secondaryAction}>
                        <Txt weight="bold" size={12.5} color={c.textMuted}>Renunț și văd rezolvarea</Txt>
                      </Press>
                    )}
                  </View>
                  <Press
                    disabled={!answer.trim()}
                    onPress={check}
                    pressDepth={4}
                    style={[
                      styles.primary,
                      answer.trim()
                        ? { backgroundColor: c.accent, borderColor: c.accent }
                        : { backgroundColor: c.surfaceAlt, borderColor: c.border },
                    ]}
                  >
                    <Txt weight="bold" size={15} color={answer.trim() ? '#FFFFFF' : c.textFaint}>Verifică răspunsul</Txt>
                    <RezIcon name="check" size={19} color={answer.trim() ? '#FFFFFF' : c.textFaint} />
                  </Press>
                </>
              )}
            </View>
          </View>
        ) : null}
      </ScreenContent>

      <ConfirmDialog
        open={confirmSolution}
        title="Vrei să vezi rezolvarea?"
        message="Această acțiune încheie încercarea independentă și afișează pașii împreună cu răspunsul final."
        confirmLabel="Arată rezolvarea"
        cancelLabel="Mai încerc"
        onClose={() => setConfirmSolution(false)}
        onConfirm={() => {
          if (exercise) saveResult(exercise, false, 'solution')
          setSolutionVisible(true)
        }}
      />
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  setupPage: { gap: 18, paddingBottom: 28, paddingTop: 4 },
  inputCard: { alignItems: 'center', borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, flexDirection: 'row', gap: 12, minHeight: 68, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 15, paddingVertical: 12 },
  modeSection: { gap: 10 },
  modeExplanation: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  error: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  primary: { alignItems: 'center', borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 62, paddingHorizontal: 18 },
  loadingPage: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 80 },
  loadingIcon: { alignItems: 'center', borderRadius: 24, height: 72, justifyContent: 'center', marginBottom: 18, width: 72 },
  loadingCopy: { lineHeight: 19, marginTop: 6, maxWidth: 300, textAlign: 'center' },
  cancelAction: { marginTop: 18, padding: 12 },
  session: { flex: 1 },
  sessionHeader: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingBottom: 10, paddingTop: 2 },
  sessionTitle: { fontSize: 26, letterSpacing: -0.8, lineHeight: 31, marginTop: 3 },
  changeButton: { alignItems: 'center', borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 11 },
  exercisePage: { gap: 14, paddingBottom: 20 },
  lockedNotice: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 9, paddingHorizontal: 12, paddingVertical: 10 },
  problemCard: { borderRadius: 26, borderWidth: 3, borderBottomWidth: 8, gap: 10, minHeight: 150, justifyContent: 'center', padding: 20 },
  prompt: { fontSize: 20, lineHeight: 29 },
  answerArea: { gap: 7 },
  answerInput: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, fontSize: 16, minHeight: 58, paddingHorizontal: 16 },
  feedback: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 11, padding: 14 },
  hints: { gap: 9 },
  hint: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 14 },
  hintNumber: { alignItems: 'center', borderRadius: 99, height: 26, justifyContent: 'center', width: 26 },
  solution: { borderRadius: 24, borderWidth: 3, borderBottomWidth: 7, gap: 12, padding: 18 },
  solutionHeader: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  solutionStep: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  finalAnswer: { borderRadius: 14, gap: 3, marginTop: 2, padding: 13 },
  actions: { borderTopWidth: 3, gap: 8, paddingBottom: 10, paddingTop: 10 },
  helpActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 38 },
  secondaryAction: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
})
