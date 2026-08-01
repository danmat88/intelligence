import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
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
        : 'Matematică'

  return (
    <View style={styles.dashboard}>
      {/* HUD Bar - Compact horizontal layout */}
      <View style={styles.hud}>
        <View style={styles.hudText}>
          <Txt weight="extrabold" size={24} color={c.text} style={{ fontFamily: theme.font.display, letterSpacing: -0.5 }}>
            Pregătirea ta
          </Txt>
          <Txt weight="bold" size={13} color={c.textMuted}>
            Ce rezolvăm astăzi?
          </Txt>
        </View>
        <Press
          onPress={onOpenSettings}
          pressDepth={3}
          style={[styles.goalBadge, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}
        >
          <RezIcon name={goal === 'en' ? 'exam-en' : goal === 'bac' ? 'exam-bac' : 'workspace'} size={16} color={c.text} accent={c.text} />
          <Txt weight="extrabold" size={11} color={c.text}>{goalTitle}</Txt>
        </Press>
      </View>

      {/* Primary Hero: Rezolvă o problemă */}
      <View style={[styles.mainHero, { backgroundColor: c.accent, borderColor: c.border, borderBottomColor: c.border }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIconBadge, { backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}>
            <RezIcon name="solve" size={28} color={c.text} accent={c.text} />
          </View>
          <View style={styles.heroTitles}>
            <Txt weight="extrabold" size={11} color={c.sunny} style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
              PROBLEMĂ NOUĂ
            </Txt>
            <Txt weight="extrabold" size={22} color="#FFFFFF" style={{ fontFamily: theme.font.display }}>
              Adaugă o problemă
            </Txt>
            <Txt size={12.5} color="rgba(255,255,255,0.9)" weight="bold" style={{ marginTop: 2 }}>
              Află răspunsul și explicațiile complete.
            </Txt>
          </View>
        </View>
        
        <View style={styles.heroActions}>
          <Press
            onPress={() => onSolve('camera')}
            pressDepth={4}
            style={[styles.heroButton, { flex: 1, backgroundColor: c.sunny, borderColor: c.border, borderBottomColor: c.border }]}
          >
            <RezIcon name="camera" size={22} color={c.text} />
            <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>FOTO</Txt>
          </Press>
          <Press
            onPress={() => onSolve('type')}
            pressDepth={4}
            style={[styles.heroButton, { flex: 1, backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
          >
            <RezIcon name="write" size={22} color={c.text} />
            <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>TEXT</Txt>
          </Press>
        </View>
      </View>

      {/* Practice & Exam Grid */}
      <View style={styles.grid}>
        <ModeCard
          icon="drill"
          title="Exersează"
          subtitle="Teste & antrenament"
          color={c.bubblyYellow}
          textColor={c.text}
          onPress={onOpenPreparation}
        />
        <ModeCard
          icon="document"
          title="Arhiva"
          subtitle="Subiecte oficiale"
          color={c.bubblyBlue}
          textColor="#FFFFFF"
          onPress={onOpenSubjects}
        />
      </View>

      {/* Smart Continue / Mistakes Section */}
      {examGoal && (
        <View style={styles.smartSection}>
          <Txt weight="extrabold" size={14} color={c.text} style={{ fontFamily: theme.font.display, marginLeft: 4, marginBottom: 8, letterSpacing: -0.2 }}>
            CONTINUĂ PREGĂTIREA
          </Txt>
          {hasMistakes ? (
            <Press
              onPress={onOpenMistakes}
              pressDepth={4}
              style={[styles.smartCard, { backgroundColor: c.chalk, borderColor: c.border, borderBottomColor: c.border }]}
            >
              <View style={[styles.smartIcon, { backgroundColor: c.dangerSoft, borderColor: c.border, borderBottomColor: c.border }]}>
                <RezIcon name="retry" size={24} color={c.danger} accent={c.danger} />
              </View>
              <View style={styles.smartCopy}>
                <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>
                  Recapitulare greșeli
                </Txt>
                <Txt size={12.5} color={c.textMuted} weight="bold">
                  Ai câteva exerciții de revizuit din ultimul test.
                </Txt>
              </View>
              <RezIcon name="arrow" size={20} color={c.textMuted} />
            </Press>
          ) : latestAttempt ? (
            <Press
              onPress={onOpenPreparation}
              pressDepth={4}
              style={[styles.smartCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
            >
              <View style={[styles.smartIcon, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}>
                <RezIcon name="compass" size={24} color={c.text} accent={c.text} />
              </View>
              <View style={styles.smartCopy}>
                <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>
                  Continuă cu un test nou
                </Txt>
                <Txt size={12.5} color={c.textMuted} weight="bold">
                  {configuredSetFromId(latestAttempt.setId)?.title ?? 'Ultimul test'} rezolvat corect.
                </Txt>
              </View>
              <RezIcon name="arrow" size={20} color={c.textMuted} />
            </Press>
          ) : (
            <Press
              onPress={onOpenPreparation}
              pressDepth={4}
              style={[styles.smartCard, { backgroundColor: c.surface, borderColor: c.border, borderBottomColor: c.border }]}
            >
              <View style={[styles.smartIcon, { backgroundColor: c.sunnySoft, borderColor: c.border, borderBottomColor: c.border }]}>
                <RezIcon name="compass" size={24} color={c.text} accent={c.text} />
              </View>
              <View style={styles.smartCopy}>
                <Txt weight="extrabold" size={16} color={c.text} style={{ fontFamily: theme.font.display }}>
                  Începe primul test
                </Txt>
                <Txt size={12.5} color={c.textMuted} weight="bold">
                  Aflăm împreună de unde merită să începi.
                </Txt>
              </View>
              <RezIcon name="arrow" size={20} color={c.textMuted} />
            </Press>
          )}
        </View>
      )}
    </View>
  )
}

function ModeCard({
  icon,
  title,
  subtitle,
  color,
  textColor,
  onPress,
}: {
  icon: RezIconName
  title: string
  subtitle: string
  color: string
  textColor: string
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Press
      onPress={onPress}
      pressDepth={5}
      containerStyle={styles.modeSlot}
      style={[styles.modeCard, { backgroundColor: color, borderColor: c.border, borderBottomColor: c.border }]}
    >
      <View style={styles.modeCardHeader}>
        <View style={[styles.modeIconBox, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <RezIcon name={icon} size={28} color={textColor} accent={textColor} />
        </View>
      </View>
      <View style={styles.modeCardCopy}>
        <Txt weight="extrabold" size={18} color={textColor} style={{ fontFamily: theme.font.display }}>
          {title}
        </Txt>
        <Txt size={12} weight="bold" color={textColor} style={{ opacity: 0.85, marginTop: 1 }}>
          {subtitle}
        </Txt>
      </View>
    </Press>
  )
}

const styles = StyleSheet.create({
  page: { paddingBottom: 24, paddingTop: 12, paddingHorizontal: 16 },
  dashboard: { gap: 20 },
  
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudText: { gap: 2, flex: 1 },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 3,
    borderBottomWidth: 6,
    maxWidth: 150,
  },

  mainHero: {
    borderRadius: 32,
    borderWidth: 3,
    borderBottomWidth: 8,
    padding: 20,
    gap: 20,
  },
  heroHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  heroIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: { flex: 1, gap: 1 },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroButton: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  grid: { flexDirection: 'row', gap: 14 },
  modeSlot: { flex: 1 },
  modeCard: {
    borderRadius: 28,
    borderWidth: 3,
    borderBottomWidth: 8,
    padding: 16,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  modeCardHeader: { alignItems: 'flex-start' },
  modeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardCopy: { marginTop: 12 },

  smartSection: { marginTop: 4 },
  smartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    gap: 14,
  },
  smartIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartCopy: { flex: 1, gap: 2 },
})

