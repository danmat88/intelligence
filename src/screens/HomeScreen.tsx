import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
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

export default function HomeScreen({ goal, onSelectGoal, onOpenPreparation, onOpenSettings, onSolve }: Props) {
  const { theme } = useTheme()
  const { height } = useWindowDimensions()
  const c = theme.colors
  const compact = height < 760

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <View style={styles.eyebrowRow}>
              <View style={[styles.signalDot, { backgroundColor: c.accent }]} />
              <Txt size={10} color={c.accent} style={[styles.eyebrow, { fontFamily: theme.font.mono }]}>SPAȚIUL TĂU DE LUCRU</Txt>
            </View>
            <Txt numberOfLines={1} style={[styles.title, compact && styles.titleCompact, { color: c.text, fontFamily: theme.font.display }]}>Ce rezolvăm azi?</Txt>
          </View>
          <View style={[styles.mathSeal, { backgroundColor: c.accentSoft }]}>
            <Txt style={[styles.mathSealText, { color: c.accent, fontFamily: theme.font.serifItalic }]}>√</Txt>
          </View>
        </View>

        <View style={[styles.console, compact && styles.consoleCompact, { backgroundColor: c.text, shadowColor: c.text }]}>
          <LinearGradient colors={['#302842', '#15121F']} start={{ x: 0, y: 0 }} end={{ x: 0.92, y: 1 }} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.consoleGlow} />
          <View style={styles.consoleTop}>
            <View style={styles.consoleLabel}>
              <View style={styles.liveDot} />
              <Txt size={9.5} color="rgba(255,255,255,0.58)" style={{ fontFamily: theme.font.mono, letterSpacing: 1.2 }}>SOLVER ACTIV</Txt>
            </View>
            <Txt size={9.5} color="rgba(255,255,255,0.34)" style={{ fontFamily: theme.font.mono }}>01 / ORICE PROBLEMĂ</Txt>
          </View>

          <View style={styles.consoleBody}>
            <View style={styles.consoleCopy}>
              <Txt style={[styles.consoleTitle, compact && styles.consoleTitleCompact, { fontFamily: theme.font.display }]}>Arată-mi exercițiul.</Txt>
              <Txt numberOfLines={2} size={12.5} color="rgba(255,255,255,0.58)" style={styles.consoleDescription}>Îl citesc, verific rezultatul și îți explic metoda clar.</Txt>
            </View>
            <Press onPress={() => onSolve('camera')} accessibilityLabel="Fotografiază problema" style={[styles.scanOrb, compact && styles.scanOrbCompact, { backgroundColor: c.accent }]}>
              <View style={styles.orbCorners}>
                <View style={[styles.orbCorner, styles.orbTL]} />
                <View style={[styles.orbCorner, styles.orbBR]} />
                <RezIcon name="camera" size={compact ? 25 : 29} color="#fff" accent="#B8FFC9" strokeWidth={1.65} />
              </View>
            </Press>
          </View>

          <View style={styles.consoleDock}>
            <Press onPress={() => onSolve('camera')} containerStyle={styles.primarySlot} style={[styles.primaryAction, { backgroundColor: c.accent }]}>
              <Txt weight="bold" size={13.5} color="#fff">Fotografiază</Txt>
              <RezIcon name="arrow" size={17} color="#fff" />
            </Press>
            <Press onPress={() => onSolve('library')} accessibilityLabel="Alege din galerie" style={styles.toolAction}>
              <RezIcon name="gallery" size={19} color="#fff" accent="#A995FF" />
              <Txt weight="semibold" size={11.5} color="rgba(255,255,255,0.78)">Galerie</Txt>
            </Press>
            <Press onPress={() => onSolve('type')} accessibilityLabel="Scrie problema" style={styles.toolAction}>
              <RezIcon name="write" size={19} color="#fff" accent="#A995FF" />
              <Txt weight="semibold" size={11.5} color="rgba(255,255,255,0.78)">Scrie</Txt>
            </Press>
          </View>
        </View>

        <View style={styles.goalHeading}>
          <View>
            <Txt size={9.5} color={c.textFaint} style={[styles.eyebrow, { fontFamily: theme.font.mono }]}>TRASEUL TĂU</Txt>
            <Txt size={18} style={[styles.sectionTitle, { color: c.text, fontFamily: theme.font.display }]}>Alege examenul</Txt>
          </View>
          <Press onPress={onOpenPreparation} hitSlop={10} style={styles.openPrep}>
            <Txt weight="bold" size={11.5} color={c.accent}>Deschide pregătirea</Txt>
            <RezIcon name="arrow" size={16} color={c.accent} />
          </Press>
        </View>

        <View style={[styles.goalRail, { backgroundColor: c.surface }]}>
          {([['en', 'Evaluare', 'VIII'], ['bac', 'Bacalaureat', 'XII']] as const).map(([key, label, grade], index) => {
            const active = goal === key
            return (
              <Press
                key={key}
                onPress={() => onSelectGoal(key)}
                containerStyle={styles.goalSlot}
                style={[
                  styles.goal,
                  index === 0 && styles.goalDivider,
                  { borderColor: c.border },
                  active && { backgroundColor: c.accentSoft },
                ]}
              >
                <Txt style={[styles.grade, { color: active ? c.accent : c.textFaint, fontFamily: theme.font.display }]}>{grade}</Txt>
                <View style={styles.goalCopy}>
                  <Txt numberOfLines={1} weight="bold" size={12.5} color={c.text}>{label}</Txt>
                  <Txt numberOfLines={1} size={10.5} color={active ? c.accent : c.textFaint}>{active ? 'traseu activ' : 'selectează'}</Txt>
                </View>
                <View style={[styles.goalMarker, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : 'transparent' }]}>
                  {active && <RezIcon name="check" size={10} color="#fff" accent="#fff" strokeWidth={2.2} />}
                </View>
              </Press>
            )
          })}
        </View>

        {!compact && (
          <View style={styles.promise}>
            <RezIcon name="spark" size={17} color={c.accent} accent={c.accent} />
            <Txt numberOfLines={1} size={11.5} color={c.textMuted} style={styles.promiseText}>Nu doar răspunsul — ideea, pașii și verificarea.</Txt>
          </View>
        )}
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', flex: 1, maxWidth: 720, paddingBottom: 9, paddingHorizontal: 18, width: '100%' },
  contentCompact: { paddingHorizontal: 16 },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  headingCopy: { flex: 1 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  signalDot: { borderRadius: 999, height: 5, width: 5 },
  eyebrow: { letterSpacing: 1.15 },
  title: { fontSize: 32, letterSpacing: -1.55, lineHeight: 37, marginTop: 5 },
  titleCompact: { fontSize: 28, lineHeight: 32 },
  mathSeal: { alignItems: 'center', borderRadius: 18, height: 45, justifyContent: 'center', width: 45 },
  mathSealText: { fontSize: 25, marginTop: -2 },
  console: { borderRadius: 28, flex: 1, marginTop: 13, maxHeight: 285, minHeight: 230, overflow: 'hidden', padding: 18, shadowOffset: { width: 0, height: 13 }, shadowOpacity: 0.2, shadowRadius: 26, elevation: 10 },
  consoleCompact: { marginTop: 10, minHeight: 210, padding: 15 },
  consoleGlow: { backgroundColor: 'rgba(104,71,245,0.30)', borderRadius: 110, height: 220, position: 'absolute', right: -105, top: -85, width: 220 },
  consoleTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  consoleLabel: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  liveDot: { backgroundColor: '#9CFFCC', borderRadius: 4, height: 6, width: 6 },
  consoleBody: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  consoleCopy: { flex: 1, paddingRight: 14 },
  consoleTitle: { color: '#fff', fontSize: 26, letterSpacing: -1.1, lineHeight: 30 },
  consoleTitleCompact: { fontSize: 23, lineHeight: 27 },
  consoleDescription: { lineHeight: 18, marginTop: 6, maxWidth: 255 },
  scanOrb: { alignItems: 'center', borderRadius: 38, height: 76, justifyContent: 'center', shadowColor: '#6847F5', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.42, shadowRadius: 19, width: 76 },
  scanOrbCompact: { borderRadius: 33, height: 66, width: 66 },
  orbCorners: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  orbCorner: { borderColor: 'rgba(255,255,255,0.55)', height: 12, position: 'absolute', width: 12 },
  orbTL: { borderLeftWidth: 1.4, borderTopWidth: 1.4, left: 0, top: 0 },
  orbBR: { borderBottomWidth: 1.4, borderRightWidth: 1.4, bottom: 0, right: 0 },
  consoleDock: { alignItems: 'center', borderTopColor: 'rgba(255,255,255,0.10)', borderTopWidth: 1, flexDirection: 'row', gap: 6, paddingTop: 11 },
  primarySlot: { flex: 1 },
  primaryAction: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', height: 43, justifyContent: 'space-between', paddingHorizontal: 14 },
  toolAction: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 43, justifyContent: 'center', paddingHorizontal: 8 },
  goalHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  sectionTitle: { letterSpacing: -0.55, marginTop: 2 },
  openPrep: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingBottom: 2 },
  goalRail: { borderRadius: 19, flexDirection: 'row', marginTop: 9, overflow: 'hidden', shadowColor: '#15121F', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  goalSlot: { flex: 1 },
  goal: { alignItems: 'center', flexDirection: 'row', gap: 8, height: 62, paddingHorizontal: 10 },
  goalDivider: { borderRightWidth: 1 },
  grade: { fontSize: 18, letterSpacing: -1.1, width: 34 },
  goalCopy: { flex: 1, gap: 2 },
  goalMarker: { alignItems: 'center', borderRadius: 999, borderWidth: 1.5, height: 17, justifyContent: 'center', width: 17 },
  promise: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 28 },
  promiseText: { letterSpacing: -0.1 },
})
