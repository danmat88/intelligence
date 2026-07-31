import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import ScreenHeading from '../components/ui/ScreenHeading'
import Txt from '../components/ui/Txt'
import { useProduct, type LearningGoal } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'
import { readPracticeAttempts, type PracticeAttempt } from '../practice/store'
import { configuredSetFromId } from '../practice/generator'

type SolveEntry = 'camera' | 'library' | 'type'

type Props = {
  onOpenSettings: () => void
  onOpenPreparation: () => void
  onOpenSubjects: () => void
  onOpenMistakes: () => void
  onSolve: (entry?: SolveEntry) => void
}

export default function HomeScreen({
  onOpenSettings,
  onOpenPreparation,
  onOpenSubjects,
  onOpenMistakes,
  onSolve,
}: Props) {
  const focused = useIsFocused()
  const { goal, bacProfile } = useProduct()
  const [latestAttempt, setLatestAttempt] = useState<PracticeAttempt | null>(null)

  useEffect(() => {
    if (!focused) return
    readPracticeAttempts()
      .then((attempts) => {
        const relevant = goal === 'en' || goal === 'bac'
          ? attempts.find((attempt) => attempt.exam === goal)
          : null
        setLatestAttempt(relevant ?? null)
      })
      .catch(() => setLatestAttempt(null))
  }, [focused, goal])

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <ScreenContent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.page}
          overScrollMode="never"
        >
          {goal && (
            <HomeContent
              goal={goal}
              bacProfile={bacProfile}
              onSolve={onSolve}
              onOpenPreparation={onOpenPreparation}
              onOpenSubjects={onOpenSubjects}
              onOpenMistakes={onOpenMistakes}
              onOpenSettings={onOpenSettings}
              latestAttempt={latestAttempt}
            />
          )}
        </ScrollView>
      </ScreenContent>
    </ScreenBackground>
  )
}

function HomeContent({
  goal,
  bacProfile,
  onSolve,
  onOpenPreparation,
  onOpenSubjects,
  onOpenMistakes,
  onOpenSettings,
  latestAttempt,
}: {
  goal: Exclude<LearningGoal, null>
  bacProfile: string
  onSolve: (entry?: SolveEntry) => void
  onOpenPreparation: () => void
  onOpenSubjects: () => void
  onOpenMistakes: () => void
  onOpenSettings: () => void
  latestAttempt: PracticeAttempt | null
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const examGoal = goal !== 'general'
  const hasMistakes = !!latestAttempt && latestAttempt.score < latestAttempt.total
  const goalTitle =
    goal === 'en'
      ? 'Evaluare Națională'
      : goal === 'bac'
        ? `BAC · ${bacProfile}`
        : 'Ajutor la matematică'

  const nextTitle = !examGoal
    ? 'Rezolvă problema de acum'
    : !latestAttempt
      ? 'Începe primul test'
      : hasMistakes
        ? 'Reia greșelile ultimului test'
        : 'Continuă cu un test nou'
  const nextDetail = !examGoal
    ? 'Fotografie, galerie sau text'
    : !latestAttempt
      ? 'Aflăm de unde merită să începi'
      : `${configuredSetFromId(latestAttempt.setId)?.title ?? 'Ultimul test'} · ${latestAttempt.score}/${latestAttempt.total}`
  const nextAction = !examGoal
    ? () => onSolve()
    : hasMistakes
      ? onOpenMistakes
      : onOpenPreparation

  return (
    <>
      <ScreenHeading
        eyebrow="BUN VENIT"
        title="Ce facem azi?"
        description="Un pas clar, bazat pe ce ai lucrat deja."
      />

      {/* ─── Goal Pill ─── */}
      <Press
        onPress={onOpenSettings}
        pressDepth={2.5}
        accessibilityLabel={`Obiectiv curent: ${goalTitle}. Schimbă obiectivul`}
        style={[styles.goal, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}
      >
        <RezIcon
          name={goal === 'en' ? 'exam-en' : goal === 'bac' ? 'exam-bac' : 'workspace'}
          size={18}
          color={c.text}
          accent={c.bubblyRed}
        />
        <Txt numberOfLines={1} weight="bold" size={13} color={c.text} style={styles.flex}>
          {goalTitle}
        </Txt>
        <Txt weight="bold" size={12} color={c.bubblyRedDark}>Schimbă</Txt>
      </Press>

      {/* ─── Focus Card (Next Step) ─── */}
      <Press
        onPress={nextAction}
        pressDepth={4}
        accessibilityRole="button"
        style={[styles.focusCard, { backgroundColor: c.chalkDark, borderColor: '#0A2926', borderBottomColor: '#071F1D' }]}
      >
        <View style={[styles.focusIcon, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark, borderBottomColor: c.bubblyYellowDark }]}>
          <RezIcon
            name={!examGoal ? 'solve' : hasMistakes ? 'retry' : 'compass'}
            size={26}
            color={c.text}
            accent={c.bubblyRed}
          />
        </View>
        <View style={styles.focusCopy}>
          <Txt weight="bold" size={10.5} color={c.bubblyYellow} style={styles.kicker}>URMĂTORUL PAS</Txt>
          <Txt style={[styles.focusTitle, { fontFamily: theme.font.display }]}>{nextTitle}</Txt>
          <Txt numberOfLines={2} size={12.5} color="rgba(255,255,255,0.85)" style={styles.focusDetail}>
            {nextDetail}
          </Txt>
        </View>
        <View style={[styles.focusArrow, { backgroundColor: c.bubblyRed, borderColor: c.bubblyRedDark, borderBottomColor: c.bubblyRedDark }]}>
          <RezIcon name="arrow" size={20} color="#FFFFFF" />
        </View>
      </Press>

      {/* ─── Quick Actions ─── */}
      <View style={styles.quickRow}>
        <QuickAction
          icon="camera"
          title="Fotografiază"
          detail="Poză nouă"
          accentBg={c.accentSoft}
          accentIcon={c.accent}
          onPress={() => onSolve('camera')}
        />
        <QuickAction
          icon={examGoal ? 'document' : 'write'}
          title={examGoal ? 'Subiecte' : 'Scrie'}
          detail={examGoal ? 'Arhiva oficială' : 'Editor matematic'}
          accentBg={c.sunnySoft}
          accentIcon={c.bubblyYellowDark}
          onPress={examGoal ? onOpenSubjects : () => onSolve('type')}
        />
      </View>
    </>
  )
}

function QuickAction({
  icon,
  title,
  detail,
  accentBg,
  accentIcon,
  onPress,
}: {
  icon: RezIconName
  title: string
  detail: string
  accentBg: string
  accentIcon: string
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Press
      onPress={onPress}
      pressDepth={3}
      containerStyle={styles.quickSlot}
      style={[styles.quick, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: accentBg, borderColor: c.cardEdge }]}>
        <RezIcon name={icon} size={22} color={c.text} accent={accentIcon} />
      </View>
      <View style={styles.quickCopy}>
        <Txt weight="bold" size={14} color={c.text}>{title}</Txt>
        <Txt numberOfLines={1} size={11.5} color={c.textMuted}>{detail}</Txt>
      </View>
      <RezIcon name="chevron" size={15} color={c.textFaint} />
    </Press>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { gap: 14, paddingBottom: 20, paddingTop: 5 },

  // Goal pill
  goal: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 3.5,
    flexDirection: 'row',
    gap: 9,
    minHeight: 42,
    paddingHorizontal: 14,
  },

  // Focus card
  focusCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 5.5,
    flexDirection: 'row',
    gap: 14,
    minHeight: 120,
    padding: 18,
  },
  focusIcon: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  focusCopy: {
    flex: 1,
    gap: 2,
  },
  focusArrow: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  focusTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  focusDetail: {
    lineHeight: 17,
    marginTop: 2,
  },
  kicker: { letterSpacing: 1 },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: 12 },
  quickSlot: { flex: 1 },
  quick: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 4.5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 78,
    paddingHorizontal: 14,
  },
  quickIcon: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  quickCopy: {
    flex: 1,
    gap: 2,
  },
})
