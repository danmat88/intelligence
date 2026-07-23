import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import AppHeader from '../components/ui/AppHeader'
import IconTile, { SelectionMark } from '../components/ui/IconTile'
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
  const chooseGoal = (next: Exclude<ExamGoal, null>) => {
    if (next === goal) return
    Haptics.selectionAsync().catch(() => {})
    onSelectGoal(next)
  }

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
          <IconTile name="math" size={45} iconSize={23} tone="violet" />
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
            <View style={[styles.scanCluster, compact && styles.scanClusterCompact]}>
              <View pointerEvents="none" style={[styles.focusCorner, styles.focusTL]} />
              <View pointerEvents="none" style={[styles.focusCorner, styles.focusBR]} />
              <Press onPress={() => onSolve('camera')} accessibilityLabel="Fotografiază problema" style={styles.scanPress}>
                <IconTile name="camera" size={compact ? 62 : 70} iconSize={compact ? 26 : 29} selected />
              </Press>
            </View>
          </View>

          <View style={styles.consoleDock}>
            <Press onPress={() => onSolve('camera')} containerStyle={styles.primarySlot} style={[styles.primaryAction, { backgroundColor: c.accent }]}>
              <View style={styles.primaryGlyph}>
                <RezIcon name="camera" size={16} color="#fff" accent="#9CFFCC" />
              </View>
              <Txt weight="bold" size={13.5} color="#fff" style={{ fontFamily: theme.font.displayMedium }}>Fotografiază</Txt>
              <RezIcon name="arrow" size={17} color="#fff" />
            </Press>
            <Press onPress={() => onSolve('library')} accessibilityLabel="Alege din galerie" style={styles.toolAction}>
              <View style={styles.toolGlyph}><RezIcon name="gallery" size={17} color="#fff" accent="#A995FF" /></View>
              <Txt weight="semibold" size={11.5} color="rgba(255,255,255,0.78)" style={{ fontFamily: theme.font.displayMedium }}>Galerie</Txt>
            </Press>
            <Press onPress={() => onSolve('type')} accessibilityLabel="Scrie problema" style={styles.toolAction}>
              <View style={styles.toolGlyph}><RezIcon name="write" size={17} color="#fff" accent="#A995FF" /></View>
              <Txt weight="semibold" size={11.5} color="rgba(255,255,255,0.78)" style={{ fontFamily: theme.font.displayMedium }}>Scrie</Txt>
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
          {([['en', 'Evaluare', 'VIII', 'exam-en'], ['bac', 'Bacalaureat', 'XII', 'exam-bac']] as const).map(([key, label, grade, icon]) => {
            const selected = goal === key
            return (
              <Press
                key={key}
                onPress={() => chooseGoal(key)}
                containerStyle={styles.goalSlot}
                style={[
                  styles.goal,
                  { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentSoft : c.surface },
                ]}
              >
                <IconTile name={icon} size={35} iconSize={17} tone={selected ? 'violet' : 'paper'} selected={selected} />
                <View style={styles.goalCopy}>
                  <View style={styles.goalNameRow}>
                    <Txt numberOfLines={1} weight="bold" size={12.5} color={c.text}>{label}</Txt>
                    <Txt size={8.5} color={selected ? c.accent : c.textFaint} style={[styles.gradeChip, { backgroundColor: selected ? 'rgba(104,71,245,0.1)' : c.surfaceAlt, fontFamily: theme.font.mono }]}>{grade}</Txt>
                  </View>
                  <Txt numberOfLines={1} size={10.5} color={selected ? c.accent : c.textFaint}>{selected ? 'traseu activ' : 'selectează'}</Txt>
                </View>
                <SelectionMark active={selected} />
              </Press>
            )
          })}
        </View>

        {!compact && (
          <View style={styles.methodRail}>
            {['CITEȘTE', 'EXPLICĂ', 'VERIFICĂ'].map((label, index) => (
              <View key={label} style={styles.methodStep}>
                <Txt size={9} color={c.accent} style={{ fontFamily: theme.font.mono }}>0{index + 1}</Txt>
                <Txt size={10} color={c.textMuted} style={{ fontFamily: theme.font.displayMedium, letterSpacing: 0.55 }}>{label}</Txt>
                {index < 2 && <View style={[styles.methodLine, { backgroundColor: c.border }]} />}
              </View>
            ))}
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
  scanCluster: { alignItems: 'center', height: 88, justifyContent: 'center', width: 88 },
  scanClusterCompact: { height: 76, width: 76 },
  scanPress: { shadowColor: '#6847F5', shadowOffset: { width: 0, height: 9 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 8 },
  focusCorner: { borderColor: 'rgba(169,149,255,0.6)', height: 15, position: 'absolute', width: 15 },
  focusTL: { borderLeftWidth: 1.4, borderTopWidth: 1.4, left: 0, top: 0 },
  focusBR: { borderBottomWidth: 1.4, borderRightWidth: 1.4, bottom: 0, right: 0 },
  consoleDock: { alignItems: 'center', borderTopColor: 'rgba(255,255,255,0.10)', borderTopWidth: 1, flexDirection: 'row', gap: 6, paddingTop: 11 },
  primarySlot: { flex: 1 },
  primaryAction: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 8, height: 43, paddingHorizontal: 7 },
  primaryGlyph: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 10, height: 29, justifyContent: 'center', width: 29 },
  toolAction: { alignItems: 'center', flexDirection: 'row', gap: 6, height: 43, justifyContent: 'center', paddingHorizontal: 6 },
  toolGlyph: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 9, borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
  goalHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  sectionTitle: { letterSpacing: -0.55, marginTop: 2 },
  openPrep: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingBottom: 2 },
  goalRail: { flexDirection: 'row', gap: 8, marginTop: 9 },
  goalSlot: { flex: 1 },
  goal: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 8, height: 66, paddingHorizontal: 9, shadowColor: '#15121F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.035, shadowRadius: 9, elevation: 1 },
  goalCopy: { flex: 1, gap: 2 },
  goalNameRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  gradeChip: { borderRadius: 6, overflow: 'hidden', paddingHorizontal: 4, paddingVertical: 1 },
  methodRail: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', minHeight: 32, paddingTop: 4 },
  methodStep: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  methodLine: { height: 1, marginHorizontal: 9, width: 20 },
})
