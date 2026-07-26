import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenIntro from '../components/ui/ScreenIntro'
import Txt from '../components/ui/Txt'
import { useTheme } from '../theme/ThemeProvider'
import type { ExamGoal, SolveEntryKind } from '../navigation/types'

type Props = {
  goal: ExamGoal
  onSelectGoal: (goal: Exclude<ExamGoal, null>) => void
  onOpenPreparation: () => void
  onOpenSettings: () => void
  onSolve: (kind: SolveEntryKind) => void
}

const method: { icon: RezIconName; title: string; copy: string }[] = [
  { icon: 'workspace', title: 'Pui problema', copy: 'poză sau text' },
  { icon: 'teacher', title: 'Înțelegi', copy: 'explicație clară' },
  { icon: 'verified', title: 'Verifici', copy: 'rezultat controlat' },
]

export default function HomeScreen({ goal, onSelectGoal, onOpenPreparation, onOpenSettings, onSolve }: Props) {
  const { theme } = useTheme()
  const { height } = useWindowDimensions()
  const c = theme.colors
  const compact = height < 760

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <ScreenIntro eyebrow="SPAȚIUL TĂU DE MATEMATICĂ" title="De unde începem?" icon="compass" />

        <View style={[styles.solveBoard, compact && styles.solveBoardCompact, { backgroundColor: c.text, shadowColor: c.text }]}>
          <LinearGradient colors={['#31284A', '#15121F']} start={{ x: 0, y: 0 }} end={{ x: 0.95, y: 1 }} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.boardGlow} />
          <View style={styles.boardHead}>
            <View>
              <Txt size={9} color="#A995FF" style={{ fontFamily: theme.font.mono, letterSpacing: 1.15 }}>REZOLVĂ ACUM</Txt>
              <Txt style={[styles.boardTitle, { fontFamily: theme.font.display }]}>Ai o problemă? Arată-mi.</Txt>
            </View>
            <View style={styles.ready}>
              <View style={styles.readyDot} />
              <Txt size={9.5} color="rgba(255,255,255,0.54)">pregătit</Txt>
            </View>
          </View>

          <View style={styles.actionGrid}>
            <Press
              onPress={() => onSolve('camera')}
              containerStyle={styles.cameraSlot}
              accessibilityLabel="Fotografiază problema"
              style={[styles.cameraAction, { backgroundColor: c.accent }]}
            >
              <View style={styles.cameraGlyph}>
                <RezIcon name="camera" size={26} color="#fff" accent="#9CFFCC" />
              </View>
              <View style={styles.actionCopy}>
                <Txt weight="bold" size={14} color="#fff">Fotografiază</Txt>
                <Txt size={10.5} color="rgba(255,255,255,0.7)">cea mai rapidă cale</Txt>
              </View>
              <RezIcon name="arrow" size={17} color="#fff" />
            </Press>

            <View style={styles.secondaryColumn}>
              <QuickAction icon="gallery" label="Galerie" onPress={() => onSolve('library')} />
              <QuickAction icon="write" label="Scrie" onPress={() => onSolve('type')} />
            </View>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <View>
            <Txt size={9} color={c.textFaint} style={{ fontFamily: theme.font.mono, letterSpacing: 1.1 }}>TRASEUL TĂU</Txt>
            <Txt style={[styles.sectionTitle, { color: c.text, fontFamily: theme.font.display }]}>Pregătire pentru examen</Txt>
          </View>
          <Press onPress={onOpenPreparation} hitSlop={10} style={styles.openPrep}>
            <Txt weight="bold" size={11.5} color={c.accent}>Deschide</Txt>
            <RezIcon name="arrow" size={15} color={c.accent} />
          </Press>
        </View>

        <View style={styles.goals}>
          <GoalButton
            icon="exam-en"
            code="VIII"
            title="Evaluare Națională"
            active={goal === 'en'}
            onPress={() => onSelectGoal('en')}
          />
          <GoalButton
            icon="exam-bac"
            code="XII"
            title="Bacalaureat"
            active={goal === 'bac'}
            onPress={() => onSelectGoal('bac')}
          />
        </View>

        {!compact && (
          <View style={[styles.methodRail, { borderColor: c.border, backgroundColor: 'rgba(255,255,255,0.52)' }]}>
            {method.map((item, index) => (
              <View key={item.title} style={[styles.methodItem, index > 0 && { borderLeftColor: c.border, borderLeftWidth: 1 }]}>
                <RezIcon name={item.icon} size={17} color={c.accent} accent={c.accent} />
                <View style={styles.methodCopy}>
                  <Txt weight="bold" size={10.5} color={c.text}>{item.title}</Txt>
                  <Txt numberOfLines={1} size={9} color={c.textFaint}>{item.copy}</Txt>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenBackground>
  )
}

function QuickAction({ icon, label, onPress }: { icon: 'gallery' | 'write'; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}>
        <RezIcon name={icon} size={19} color="#fff" accent="#A995FF" />
      </View>
      <Txt weight="semibold" size={11.5} color="rgba(255,255,255,0.78)">{label}</Txt>
      <RezIcon name="chevron" size={13} color="rgba(255,255,255,0.32)" />
    </Press>
  )
}

function GoalButton({
  icon,
  code,
  title,
  active,
  onPress,
}: {
  icon: 'exam-en' | 'exam-bac'
  code: string
  title: string
  active: boolean
  onPress: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <Press
      onPress={onPress}
      containerStyle={styles.goalSlot}
      style={[
        styles.goal,
        {
          backgroundColor: active ? c.text : c.surface,
          borderColor: active ? c.text : c.border,
        },
      ]}
    >
      <View style={[styles.goalIcon, { backgroundColor: active ? 'rgba(255,255,255,0.1)' : c.accentSoft }]}>
        <RezIcon name={icon} size={21} color={active ? '#A995FF' : c.accent} accent={active ? '#A995FF' : c.accent} />
      </View>
      <View style={styles.goalCopy}>
        <Txt size={9} color={active ? '#A995FF' : c.textFaint} style={{ fontFamily: theme.font.mono }}>{code}</Txt>
        <Txt numberOfLines={1} weight="bold" size={11.5} color={active ? '#fff' : c.text}>{title}</Txt>
      </View>
      <View style={[styles.goalState, { borderColor: active ? '#A995FF' : c.border, backgroundColor: active ? '#A995FF' : 'transparent' }]}>
        {active && <RezIcon name="check" size={9} color="#15121F" accent="#15121F" strokeWidth={2.2} />}
      </View>
    </Press>
  )
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', flex: 1, maxWidth: 720, paddingBottom: 9, paddingHorizontal: 18, width: '100%' },
  contentCompact: { paddingHorizontal: 16 },
  solveBoard: { borderRadius: 27, height: 188, marginTop: 7, overflow: 'hidden', padding: 16, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.19, shadowRadius: 25, elevation: 9 },
  solveBoardCompact: { height: 174, marginTop: 4, padding: 14 },
  boardGlow: { backgroundColor: 'rgba(124,92,255,0.28)', borderRadius: 120, height: 240, position: 'absolute', right: -120, top: -105, width: 240 },
  boardHead: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  boardTitle: { color: '#fff', fontSize: 20, letterSpacing: -0.75, lineHeight: 25, marginTop: 3 },
  ready: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingTop: 2 },
  readyDot: { backgroundColor: '#9CFFCC', borderRadius: 9, height: 6, width: 6 },
  actionGrid: { flex: 1, flexDirection: 'row', gap: 8, marginTop: 13 },
  cameraSlot: { flex: 1.45 },
  cameraAction: { alignItems: 'center', borderRadius: 18, flex: 1, flexDirection: 'row', paddingHorizontal: 12 },
  cameraGlyph: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, height: 45, justifyContent: 'center', width: 45 },
  actionCopy: { flex: 1, gap: 2, marginLeft: 10 },
  secondaryColumn: { flex: 1, gap: 7 },
  quickAction: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 15, flex: 1, flexDirection: 'row', gap: 7, paddingHorizontal: 9 },
  quickIcon: { alignItems: 'center', justifyContent: 'center', width: 23 },
  sectionHead: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  sectionTitle: { fontSize: 17.5, letterSpacing: -0.58, marginTop: 2 },
  openPrep: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingBottom: 2 },
  goals: { flexDirection: 'row', gap: 8, marginTop: 8 },
  goalSlot: { flex: 1 },
  goal: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 68, paddingHorizontal: 10 },
  goalIcon: { alignItems: 'center', borderRadius: 13, height: 39, justifyContent: 'center', width: 39 },
  goalCopy: { flex: 1, gap: 2 },
  goalState: { alignItems: 'center', borderRadius: 99, borderWidth: 1.5, height: 17, justifyContent: 'center', width: 17 },
  methodRail: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', marginTop: 10, minHeight: 52, overflow: 'hidden' },
  methodItem: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', paddingHorizontal: 7 },
  methodCopy: { gap: 1 },
})
