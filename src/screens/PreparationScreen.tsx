import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import AppHeader from '../components/ui/AppHeader'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'
import { useTheme } from '../theme/ThemeProvider'
import type { BacProfile, ExamGoal, SolveEntryKind } from '../navigation/types'

type Props = {
  goal: ExamGoal
  bacProfile: BacProfile
  onSelectGoal: (goal: Exclude<ExamGoal, null>) => void
  onSelectBacProfile: (profile: BacProfile) => void
  onOpenSettings: () => void
  onSolve: (kind: SolveEntryKind) => void
}

const profiles: { value: BacProfile; short: string }[] = [
  { value: 'Mate-info', short: 'Mate-info' },
  { value: 'Științe ale naturii', short: 'Științe' },
  { value: 'Tehnologic', short: 'Tehnologic' },
  { value: 'Pedagogic', short: 'Pedagogic' },
]

const modes: { icon: RezIconName; title: string; copy: string }[] = [
  { icon: 'learn', title: 'Învață', copy: 'înțelegi metoda' },
  { icon: 'drill', title: 'Exersează', copy: 'lucrezi ghidat' },
  { icon: 'simulate', title: 'Simulează', copy: 'ca la examen' },
]

export default function PreparationScreen({ goal, bacProfile, onSelectGoal, onSelectBacProfile, onOpenSettings, onSolve }: Props) {
  const { theme } = useTheme()
  const { height } = useWindowDimensions()
  const c = theme.colors
  const exam = goal ?? 'en'
  const isEn = exam === 'en'
  const compact = height < 760

  return (
    <ScreenBackground>
      <AppHeader onOpenSettings={onOpenSettings} />
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Txt size={9.5} color={c.accent} style={[styles.eyebrow, { fontFamily: theme.font.mono }]}>PREGĂTIRE PERSONALIZATĂ</Txt>
            <Txt numberOfLines={1} maxFontSizeMultiplier={1.12} style={[styles.title, compact && styles.titleCompact, { color: c.text, fontFamily: theme.font.display }]}>Examenul, fără haos.</Txt>
          </View>
          <RezIcon name="spark" size={27} color={c.accent} accent={c.accent} />
        </View>

        <View style={[styles.switcher, { backgroundColor: c.surfaceAlt }]}>
          <Press onPress={() => onSelectGoal('en')} containerStyle={styles.switchSlot} style={[styles.switch, isEn && { backgroundColor: c.text }]}>
            <Txt size={9.5} color={isEn ? '#A995FF' : c.textFaint} style={{ fontFamily: theme.font.mono }}>VIII</Txt>
            <Txt weight="bold" size={12.5} color={isEn ? '#fff' : c.textMuted}>Evaluare</Txt>
          </Press>
          <Press onPress={() => onSelectGoal('bac')} containerStyle={styles.switchSlot} style={[styles.switch, !isEn && { backgroundColor: c.text }]}>
            <Txt size={9.5} color={!isEn ? '#A995FF' : c.textFaint} style={{ fontFamily: theme.font.mono }}>XII</Txt>
            <Txt weight="bold" size={12.5} color={!isEn ? '#fff' : c.textMuted}>Bacalaureat</Txt>
          </Press>
        </View>

        <View style={[styles.passport, compact && styles.passportCompact, { backgroundColor: c.surface, shadowColor: c.text }]}>
          <LinearGradient colors={isEn ? ['#F0ECFF', '#FCFCFF'] : ['#E9E9F3', '#FCFCFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[styles.passportSignal, { backgroundColor: isEn ? c.accent : c.text }]} />
          <Txt pointerEvents="none" style={[styles.roman, compact && styles.romanCompact, { color: isEn ? 'rgba(104,71,245,0.07)' : 'rgba(21,18,31,0.06)', fontFamily: theme.font.display }]}>{isEn ? 'VIII' : 'XII'}</Txt>

          <View style={styles.passportTop}>
            <View style={styles.examIdentity}>
              <View style={[styles.examCode, { backgroundColor: isEn ? c.accent : c.text }]}>
                <Txt weight="bold" size={9.5} color="#fff" style={{ fontFamily: theme.font.mono }}>{isEn ? 'EN' : 'BAC'}</Txt>
              </View>
              <View>
                <Txt size={9.5} color={c.textFaint} style={{ fontFamily: theme.font.mono, letterSpacing: 1.05 }}>MATEMATICĂ</Txt>
                <Txt size={10.5} color={c.textMuted}>{isEn ? 'clasa a VIII-a' : bacProfile}</Txt>
              </View>
            </View>
            <View style={[styles.status, { backgroundColor: c.successSoft }]}>
              <View style={[styles.statusDot, { backgroundColor: c.success }]} />
              <Txt weight="bold" size={9.5} color={c.success}>gata de început</Txt>
            </View>
          </View>

          <View style={styles.passportMiddle}>
            <Txt style={[styles.examTitle, compact && styles.examTitleCompact, { color: c.text, fontFamily: theme.font.display }]}>{isEn ? 'Evaluarea Națională' : 'Bacalaureat'}</Txt>
            <Txt numberOfLines={2} size={12} color={c.textMuted} style={styles.examCopy}>{isEn ? 'Înțelegi materia, exersezi țintit și verifici fiecare pas.' : 'Traseul și exercițiile respectă profilul tău de matematică.'}</Txt>
          </View>

          {!isEn && (
            <View style={styles.profileGrid}>
              {profiles.map(({ value, short }) => {
                const active = value === bacProfile
                return (
                  <Press key={value} onPress={() => onSelectBacProfile(value)} containerStyle={styles.profileSlot} style={[styles.profile, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentSoft : 'rgba(255,255,255,0.65)' }]}>
                    <View style={[styles.profileRadio, { borderColor: active ? c.accent : c.textFaint, backgroundColor: active ? c.accent : 'transparent' }]} />
                    <Txt numberOfLines={1} weight="semibold" size={10.5} color={active ? c.accent : c.textMuted}>{short}</Txt>
                  </Press>
                )
              })}
            </View>
          )}

          <View style={styles.passportActions}>
            <Press onPress={() => onSolve('camera')} containerStyle={styles.startSlot} style={[styles.start, { backgroundColor: c.text }]}>
              <View style={[styles.startIcon, { backgroundColor: c.accent }]}>
                <RezIcon name="camera" size={18} color="#fff" accent="#B8FFC9" />
              </View>
              <Txt weight="bold" size={13} color="#fff" style={styles.startText}>Începe cu o problemă</Txt>
              <RezIcon name="arrow" size={17} color="#fff" />
            </Press>
            <Press onPress={() => onSolve('type')} accessibilityLabel="Scrie o problemă" style={[styles.writeAction, { backgroundColor: c.surface }]}>
              <RezIcon name="write" size={19} color={c.text} accent={c.accent} />
            </Press>
          </View>
        </View>

        <View style={styles.modeHeading}>
          <Txt style={[styles.sectionTitle, { color: c.text, fontFamily: theme.font.display }]}>Cum lucrezi</Txt>
          <Txt size={10.5} color={c.textFaint}>alegi ritmul potrivit</Txt>
        </View>
        <View style={styles.modeDeck}>
          {modes.map((mode, index) => (
            <View key={mode.title} style={[styles.mode, index === 1 && { backgroundColor: c.text }]}> 
              <RezIcon name={mode.icon} size={21} color={index === 1 ? '#fff' : c.text} accent={c.accent} />
              <Txt weight="bold" size={11.5} color={index === 1 ? '#fff' : c.text} style={styles.modeTitle}>{mode.title}</Txt>
              <Txt numberOfLines={1} size={9.5} color={index === 1 ? 'rgba(255,255,255,0.54)' : c.textFaint}>{mode.copy}</Txt>
            </View>
          ))}
        </View>

        {!compact && (
          <View style={styles.integrity}>
            <RezIcon name="shield" size={16} color={c.accent} accent={c.accent} />
            <Txt numberOfLines={1} size={10.5} color={c.textMuted} style={styles.integrityText}>Progresul apare numai după exerciții verificate.</Txt>
          </View>
        )}
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', flex: 1, maxWidth: 720, paddingBottom: 9, paddingHorizontal: 18, width: '100%' },
  contentCompact: { paddingHorizontal: 16 },
  heading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  headingCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { letterSpacing: 1.08 },
  title: { fontSize: 29, letterSpacing: -1.35, lineHeight: 35, marginTop: 4 },
  titleCompact: { fontSize: 26, lineHeight: 30 },
  switcher: { borderRadius: 17, flexDirection: 'row', gap: 3, marginTop: 11, padding: 3 },
  switchSlot: { flex: 1 },
  switch: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 8, height: 40, justifyContent: 'center' },
  passport: { borderRadius: 27, flex: 1, marginTop: 10, maxHeight: 310, minHeight: 247, overflow: 'hidden', padding: 17, shadowOffset: { width: 0, height: 11 }, shadowOpacity: 0.11, shadowRadius: 24, elevation: 6 },
  passportCompact: { minHeight: 230, padding: 14 },
  passportSignal: { bottom: 0, left: 0, position: 'absolute', top: 0, width: 5 },
  roman: { bottom: -30, fontSize: 145, letterSpacing: -10, position: 'absolute', right: -4 },
  romanCompact: { fontSize: 126 },
  passportTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  examIdentity: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  examCode: { alignItems: 'center', borderRadius: 9, height: 29, justifyContent: 'center', width: 39 },
  status: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 6 },
  statusDot: { borderRadius: 999, height: 5, width: 5 },
  passportMiddle: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
  examTitle: { fontSize: 25, letterSpacing: -1.05, lineHeight: 29 },
  examTitleCompact: { fontSize: 23, lineHeight: 27 },
  examCopy: { lineHeight: 17, marginTop: 4, maxWidth: 270 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  profileSlot: { width: '49%' },
  profile: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 6, height: 30, paddingHorizontal: 8 },
  profileRadio: { borderRadius: 999, borderWidth: 1.3, height: 9, width: 9 },
  passportActions: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  startSlot: { flex: 1 },
  start: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', height: 48, paddingHorizontal: 8 },
  startIcon: { alignItems: 'center', borderRadius: 12, height: 34, justifyContent: 'center', width: 34 },
  startText: { flex: 1, marginLeft: 9 },
  writeAction: { alignItems: 'center', borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  modeHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },
  sectionTitle: { fontSize: 17, letterSpacing: -0.55 },
  modeDeck: { flexDirection: 'row', gap: 6, marginTop: 7 },
  mode: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 16, flex: 1, minHeight: 78, padding: 10 },
  modeTitle: { marginBottom: 2, marginTop: 8 },
  integrity: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 27 },
  integrityText: { letterSpacing: -0.08 },
})
