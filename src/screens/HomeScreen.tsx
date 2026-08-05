import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { useAuth } from '../auth/AuthProvider'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import Txt from '../components/ui/Txt'
import { useProduct, type LearningGoal } from '../product/ProductProvider'
import { readPracticeAttempts, type PracticeAttempt } from '../practice/store'
import { subscribeProblems, type Problem } from '../solve/store'
import { useTheme } from '../theme/ThemeProvider'
import Entrance from '../components/ui/Entrance'

type SolveEntry = 'camera' | 'library' | 'type'

type Props = {
  onOpenPreparation: () => void
  onOpenMistakes: () => void
  onOpenProblem: (problem: Problem) => void
  onSolve: (entry?: SolveEntry) => void
}

export default function HomeScreen({
  onOpenPreparation,
  onOpenMistakes,
  onOpenProblem,
  onSolve,
}: Props) {
  const focused = useIsFocused()
  const { user } = useAuth()
  const { goal, bacProfile, bacTrack } = useProduct()
  const [latestAttempt, setLatestAttempt] = useState<PracticeAttempt | null>(null)
  const [latestProblem, setLatestProblem] = useState<Problem | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeProblems(user.id, (items) => setLatestProblem(items[0] ?? null))
  }, [user?.id])

  useEffect(() => {
    if (!focused || !user) return
    readPracticeAttempts(user.id)
      .then((attempts) => {
        const relevant = goal === 'en' || goal === 'bac'
          ? attempts.find((attempt) =>
              attempt.exam === goal && (goal !== 'bac' || attempt.profile === bacTrack),
            )
          : null
        setLatestAttempt(relevant ?? null)
      })
      .catch(() => setLatestAttempt(null))
  }, [bacTrack, focused, goal, user?.id])

  if (!goal) return null

  return (
    <ScreenBackground>
      <ScreenContent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={styles.page}
        >
          <Entrance delay={0}>
            <HomeHeading goal={goal} bacProfile={bacProfile} />
          </Entrance>

          {(goal === 'en' || goal === 'bac') && (
            <Entrance delay={45}>
              <ExamNextAction
                attempt={latestAttempt}
                onOpenPreparation={onOpenPreparation}
                onOpenMistakes={onOpenMistakes}
              />
            </Entrance>
          )}

          {latestProblem && (
            <Entrance delay={(goal === 'en' || goal === 'bac') ? 90 : 45}>
              <ContinueProblem problem={latestProblem} onPress={() => onOpenProblem(latestProblem)} />
            </Entrance>
          )}

          <Entrance delay={(goal === 'en' || goal === 'bac') ? (latestProblem ? 135 : 90) : (latestProblem ? 90 : 45)}>
            <SolveCard onSolve={onSolve} />
          </Entrance>
        </ScrollView>
      </ScreenContent>
    </ScreenBackground>
  )
}

function HomeHeading({ goal, bacProfile }: { goal: Exclude<LearningGoal, null>; bacProfile: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  const exam = goal === 'en' || goal === 'bac'
  const label = goal === 'en'
    ? 'Evaluarea Națională'
    : goal === 'bac'
      ? `BAC · ${bacProfile}`
      : 'Ajutor la matematică'

  return (
    <View style={styles.heading}>
      <View style={styles.headingCopy}>
        <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>
          {exam ? 'Continuă de unde ai rămas' : 'Cu ce problemă te ajut?'}
        </Txt>
        <Txt size={13.5} color={c.textMuted} style={styles.subtitle}>
          {exam
            ? 'O singură acțiune utilă, bazată pe ce ai lucrat.'
            : 'Fotografiază, scrie sau reia o problemă.'}
        </Txt>
      </View>
      <View style={[styles.goal, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark }]}>
        <RezIcon name={goal === 'en' ? 'exam-en' : goal === 'bac' ? 'exam-bac' : 'workspace'} size={17} color={c.text} accent={c.bubblyRed} />
        <Txt numberOfLines={1} weight="bold" size={11.5} color={c.text}>{label}</Txt>
      </View>
    </View>
  )
}

function ExamNextAction({
  attempt,
  onOpenPreparation,
  onOpenMistakes,
}: {
  attempt: PracticeAttempt | null
  onOpenPreparation: () => void
  onOpenMistakes: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const hasMistakes = !!attempt && attempt.score < attempt.total
  const title = !attempt
    ? 'Alege primul set de exerciții'
    : hasMistakes
      ? 'Reia exercițiile greșite'
      : 'Continuă cu un set nou'
  const detail = !attempt
    ? 'Până la primul rezultat, situația ta rămâne neevaluată.'
    : hasMistakes
      ? `${attempt.total - attempt.score} ${attempt.total - attempt.score === 1 ? 'răspuns de verificat' : 'răspunsuri de verificat'} din ultimul set.`
      : `Ultimul rezultat: ${attempt.score}/${attempt.total}, fără a-l transforma într-un procent de „pregătire”.`

  return (
    <Press
      onPress={hasMistakes ? onOpenMistakes : onOpenPreparation}
      pressDepth={4}
      style={[styles.nextCard, { backgroundColor: c.chalkDark, borderColor: '#0A2926', borderBottomColor: '#071F1D' }]}
    >
      <View style={[styles.nextIcon, { backgroundColor: c.sunny, borderColor: c.bubblyYellowDark }]}>
        <RezIcon name={hasMistakes ? 'retry' : 'practice'} size={25} color={c.text} accent={c.bubblyRed} />
      </View>
      <View style={styles.flex}>
        <Txt weight="bold" size={11} color={c.sunny}>URMĂTORUL PAS</Txt>
        <Txt weight="bold" size={17} color="#FFFFFF" style={{ marginTop: 3 }}>{title}</Txt>
        <Txt size={12.5} color="rgba(255,255,255,0.76)" style={styles.nextDetail}>{detail}</Txt>
      </View>
      <RezIcon name="arrow" size={20} color="#FFFFFF" />
    </Press>
  )
}

function ContinueProblem({ problem, onPress }: { problem: Problem; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Press
      onPress={onPress}
      pressDepth={3}
      style={[styles.continueCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
    >
      <View style={[styles.continueIcon, { backgroundColor: c.sunnySoft }]}>
        <RezIcon name="history" size={21} color={c.text} accent={c.bubblyRed} />
      </View>
      <View style={styles.flex}>
        <Txt weight="bold" size={11} color={c.textMuted}>CONTINUĂ ULTIMA PROBLEMĂ</Txt>
        <Txt numberOfLines={2} weight="bold" size={14.5} color={c.text} style={{ marginTop: 3 }}>
          {problem.topic || problem.title}
        </Txt>
      </View>
      <RezIcon name="chevron" size={18} color={c.textFaint} />
    </Press>
  )
}

function SolveCard({ onSolve }: { onSolve: (entry?: SolveEntry) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={[styles.solveCard, { backgroundColor: c.accent, borderColor: c.border, borderBottomColor: c.border }]}>
      <View style={styles.solveHeading}>
        <View style={[styles.solveIcon, { backgroundColor: c.sunny, borderColor: c.border }]}>
          <RezIcon name="solve" size={27} color={c.text} accent={c.bubblyRed} />
        </View>
        <View style={styles.flex}>
          <Txt weight="bold" size={19} color="#FFFFFF" style={{ fontFamily: theme.font.display }}>Rezolvă o problemă</Txt>
          <Txt size={12.5} color="rgba(255,255,255,0.82)" style={{ marginTop: 2 }}>
            După enunț alegi: indiciu, soluție sau verificarea lucrării.
          </Txt>
        </View>
      </View>
      <View style={styles.solveActions}>
        <SolveAction icon="camera" label="Fotografie" onPress={() => onSolve('camera')} />
        <SolveAction icon="write" label="Scrie" onPress={() => onSolve('type')} />
        <SolveAction icon="gallery" label="Galerie" onPress={() => onSolve('library')} />
      </View>
    </View>
  )
}

function SolveAction({ icon, label, onPress }: { icon: 'camera' | 'write' | 'gallery'; label: string; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Press
      onPress={onPress}
      pressDepth={3}
      style={[styles.solveAction, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
    >
      <RezIcon name={icon} size={20} color={c.text} accent={c.bubblyRed} />
      <Txt weight="bold" size={12.5} color={c.text}>{label}</Txt>
    </Press>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 16, paddingBottom: 26, paddingTop: 8 },
  heading: { alignItems: 'flex-start', gap: 13 },
  headingCopy: { maxWidth: 560 },
  title: { fontSize: 30, letterSpacing: -1, lineHeight: 35 },
  subtitle: { lineHeight: 19, marginTop: 5 },
  goal: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 99, borderWidth: 2, borderBottomWidth: 4, flexDirection: 'row', gap: 7, maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 7 },
  nextCard: { alignItems: 'center', borderRadius: 26, borderWidth: 3, borderBottomWidth: 8, flexDirection: 'row', gap: 14, minHeight: 122, padding: 18 },
  nextIcon: { alignItems: 'center', borderRadius: 18, borderWidth: 3, borderBottomWidth: 6, height: 56, justifyContent: 'center', width: 56 },
  nextDetail: { lineHeight: 17, marginTop: 4 },
  continueCard: { alignItems: 'center', borderRadius: 22, borderWidth: 3, borderBottomWidth: 7, flexDirection: 'row', gap: 12, minHeight: 82, padding: 14 },
  continueIcon: { alignItems: 'center', borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  solveCard: { borderRadius: 26, borderWidth: 3, borderBottomWidth: 8, gap: 16, padding: 18 },
  solveHeading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  solveIcon: { alignItems: 'center', borderRadius: 18, borderWidth: 3, borderBottomWidth: 6, height: 56, justifyContent: 'center', width: 56 },
  solveActions: { flexDirection: 'row', gap: 8 },
  solveAction: { alignItems: 'center', borderRadius: 18, borderWidth: 3, borderBottomWidth: 6, flex: 1, gap: 5, justifyContent: 'center', minHeight: 68 },
})
