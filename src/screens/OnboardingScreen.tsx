import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Entrance from '../components/ui/Entrance'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import Txt from '../components/ui/Txt'
import { useProduct } from '../product/ProductProvider'
import { BAC_TRACKS, BAC_TRACK_LABELS, type BacTrack, type ExamGoal } from '../product/profile'
import { useTheme } from '../theme/ThemeProvider'

type Step = 'welcome' | 'goal' | 'profile'

const goals: Array<{
  id: 'en' | 'bac' | 'none'
  value: ExamGoal
  title: string
  copy: string
  eyebrow: string
  icon: RezIconName
  tone: 'red' | 'blue' | 'yellow'
}> = [
  { id: 'en', value: 'en', title: 'Evaluarea Națională', copy: 'Subiecte oficiale, exerciții și rezultate pentru proba de matematică.', eyebrow: 'CLASA A VIII-A', icon: 'exam-en', tone: 'red' },
  { id: 'bac', value: 'bac', title: 'Bacalaureat', copy: 'Pregătire potrivită profilului tău, de la exercițiu la simulare.', eyebrow: 'M1 · M2 · M3 · PEDAGOGIC', icon: 'exam-bac', tone: 'blue' },
  { id: 'none', value: null, title: 'Matematică, fără examen', copy: 'Rezolv probleme și exersez orice subiect aleg, fără o programă impusă.', eyebrow: 'ORICE NIVEL', icon: 'workspace', tone: 'yellow' },
]

const profiles = BAC_TRACKS
const profileDescriptions: Record<BacTrack, string> = {
  mate_info: 'Programa M1',
  stiinte_naturii: 'Programa M2',
  tehnologic: 'Programa M3',
  pedagogic: 'Programa profilului pedagogic',
}

export default function OnboardingScreen({
  onSolve,
  onCompleted,
  onCompletionStarted,
  onCompletionFailed,
}: {
  onSolve: () => void | Promise<void>
  /** Fires only after this screen explicitly persists onboarding. */
  onCompleted?: () => void
  /** Lets the launch flow distinguish a local completion from a returning user. */
  onCompletionStarted?: () => void
  onCompletionFailed?: () => void
}) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const { completeOnboarding, saving } = useProduct()
  const c = theme.colors
  const [step, setStep] = useState<Step>('welcome')
  const [error, setError] = useState<string | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<'en' | 'bac' | 'none' | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<BacTrack | null>(null)

  const continueGoal = async () => {
    if (!selectedGoal) return
    const goal: ExamGoal = selectedGoal === 'none' ? null : selectedGoal
    if (goal === 'bac') {
      setStep('profile')
      return
    }
    setError(null)
    onCompletionStarted?.()
    try {
      await completeOnboarding(goal)
      onCompleted?.()
    } catch {
      onCompletionFailed?.()
      setError('Nu am putut salva alegerea. Verifică internetul și încearcă din nou.')
    }
  }

  const continueBacTrack = async () => {
    if (!selectedTrack) return
    setError(null)
    onCompletionStarted?.()
    try {
      await completeOnboarding('bac', selectedTrack)
      onCompleted?.()
    } catch {
      onCompletionFailed?.()
      setError('Nu am putut salva profilul. Verifică internetul și încearcă din nou.')
    }
  }

  const solveNow = async () => {
    setError(null)
    try {
      await onSolve()
    } catch {
      setError('Nu am putut pregÄƒti aplicaÈ›ia. VerificÄƒ internetul È™i Ã®ncearcÄƒ din nou.')
    }
  }

  return (
    <ScreenBackground>
      <ScreenContent style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {step === 'welcome' ? (
          <View style={styles.stepFill}>
            <ScrollView
              style={styles.welcomeScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.welcomePage}
            >
              <View style={[styles.brand, { height: 64 }]} />

              <Entrance delay={90}>
                <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.text, borderBottomColor: c.text }]}>
                  <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>
                    Tu alegi cât ajutor primești.
                  </Txt>
                  <Txt size={14.5} color={c.textMuted} style={styles.subtitle}>
                    Fotografiezi sau scrii problema. Profu’ îți oferă exact ce ceri, fără să-ți strice exercițiul.
                  </Txt>
                  <HelpJourney />
                </View>
              </Entrance>
            </ScrollView>

            <Entrance delay={175} style={styles.footer}>
              <Press onPress={() => setStep('goal')} pressDepth={4} style={[styles.primary, { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }]}>
                <Txt weight="bold" size={15.5} color="#FFFFFF">Personalizează aplicația</Txt>
                <RezIcon name="arrow" size={20} color="#FFFFFF" />
              </Press>
              {error && <Txt size={13} color={c.danger} style={styles.error}>{error}</Txt>}
              <Press onPress={() => void solveNow()} disabled={saving} pressDepth={2} style={styles.secondary}>
                <RezIcon name="solve" size={19} color={c.bubblyRed} accent={c.bubblyYellow} />
                <Txt weight="bold" size={14} color={c.bubblyRed}>Am o problemă de rezolvat acum</Txt>
              </Press>
            </Entrance>
          </View>
        ) : step === 'goal' ? (
          <>
            <OnboardingHeader
              eyebrow="OBIECTIV"
              title="Te pregătești pentru un examen?"
              copy="Examenul adaugă programa, subiectele și rezultatele potrivite. Rezolvitorul rămâne disponibil pentru orice problemă."
              onBack={() => setStep('welcome')}
            />
            <ScrollView
              style={styles.selectionScroll}
              contentContainerStyle={styles.selectionList}
              showsVerticalScrollIndicator={false}
            >
              {goals.map((goal) => {
                const selected = selectedGoal === goal.id
                const accent = goal.tone === 'red' ? c.bubblyRed : goal.tone === 'blue' ? c.bubblyBlue : c.bubblyYellow
                const accentDark = goal.tone === 'red' ? c.bubblyRedDark : goal.tone === 'blue' ? c.bubblyBlueDark : c.bubblyYellowDark
                const soft = goal.tone === 'red' ? c.accentSoft : goal.tone === 'blue' ? '#E4F6FF' : c.sunnySoft
                return (
                  <Entrance key={goal.id} delay={35 + goals.indexOf(goal) * 55}>
                    <Press
                      onPress={() => {
                        setSelectedGoal(goal.id)
                        setError(null)
                      }}
                      disabled={saving}
                      pressDepth={2}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.selection,
                        selected
                          ? { backgroundColor: soft, borderColor: accentDark, borderBottomColor: accentDark }
                          : { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge },
                      ]}
                    >
                      <View style={[styles.selectionIcon, { backgroundColor: accent, borderColor: accentDark }]}>
                        <RezIcon name={goal.icon} size={25} color={goal.tone === 'yellow' ? c.text : '#FFFFFF'} accent={goal.tone === 'yellow' ? c.bubblyRed : '#FFFFFF'} />
                      </View>
                      <View style={styles.flex}>
                        <Txt weight="bold" size={10.5} color={accentDark} style={[styles.optionEyebrow, { fontFamily: theme.font.mono }]}>
                          {goal.eyebrow}
                        </Txt>
                        <Txt weight="bold" size={16} color={c.text}>{goal.title}</Txt>
                        <Txt size={12.5} color={c.textMuted} style={styles.optionCopy}>{goal.copy}</Txt>
                      </View>
                      <View style={[styles.radio, { borderColor: selected ? accentDark : c.textFaint, backgroundColor: selected ? accent : 'transparent' }]}>
                        {selected && <RezIcon name="check" size={13} color="#FFFFFF" />}
                      </View>
                    </Press>
                  </Entrance>
                )
              })}
            </ScrollView>
            {error && <Txt size={13} color={c.danger} style={styles.error}>{error}</Txt>}
            <Press
              onPress={() => void continueGoal()}
              disabled={!selectedGoal || saving}
              pressDepth={4}
              style={[
                styles.primary,
                selectedGoal
                  ? { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }
                  : { backgroundColor: c.surfaceAlt, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' },
              ]}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Txt weight="bold" size={15.5} color={selectedGoal ? '#FFFFFF' : c.textFaint}>
                    {selectedGoal === 'bac' ? 'Alege profilul' : 'Continuă'}
                  </Txt>
                  <RezIcon name="arrow" size={20} color={selectedGoal ? '#FFFFFF' : c.textFaint} />
                </>
              )}
            </Press>
          </>
        ) : (
          <>
            <OnboardingHeader
              eyebrow="PROFIL BAC"
              title="Ce profil de BAC ai?"
              copy="Fiecare profil are programă și structură diferite."
              onBack={() => setStep('goal')}
            />
            <ScrollView
              style={styles.selectionScroll}
              contentContainerStyle={styles.selectionList}
              showsVerticalScrollIndicator={false}
            >
              {profiles.map((profile, index) => {
                const selected = selectedTrack === profile
                return (
                  <Entrance key={profile} delay={35 + index * 45}>
                    <Press
                      onPress={() => {
                        setSelectedTrack(profile)
                        setError(null)
                      }}
                      disabled={saving}
                      pressDepth={2}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.selection,
                        selected
                          ? { backgroundColor: '#E4F6FF', borderColor: c.bubblyBlueDark, borderBottomColor: c.bubblyBlueDark }
                          : { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge },
                      ]}
                    >
                      <View style={[styles.profileNumber, { backgroundColor: selected ? c.bubblyBlue : index === 0 ? c.bubblyYellow : c.surfaceAlt, borderColor: selected ? c.bubblyBlueDark : index === 0 ? c.bubblyYellowDark : c.cardEdge }]}>
                        <Txt weight="bold" size={13} color={selected ? '#FFFFFF' : c.text}>{index + 1}</Txt>
                      </View>
                      <View style={styles.flex}>
                        <Txt weight="bold" size={16} color={c.text}>{BAC_TRACK_LABELS[profile]}</Txt>
                        <Txt size={12.5} color={c.textMuted} style={styles.optionCopy}>{profileDescriptions[profile]}</Txt>
                      </View>
                      <View style={[styles.radio, { borderColor: selected ? c.bubblyBlueDark : c.textFaint, backgroundColor: selected ? c.bubblyBlue : 'transparent' }]}>
                        {selected && <RezIcon name="check" size={13} color="#FFFFFF" />}
                      </View>
                    </Press>
                  </Entrance>
                )
              })}
            </ScrollView>
            {error && <Txt size={13} color={c.danger} style={styles.error}>{error}</Txt>}
            <Press
              onPress={() => void continueBacTrack()}
              disabled={!selectedTrack || saving}
              pressDepth={4}
              style={[
                styles.primary,
                selectedTrack
                  ? { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }
                  : { backgroundColor: c.surfaceAlt, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' },
              ]}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Txt weight="bold" size={15.5} color={selectedTrack ? '#FFFFFF' : c.textFaint}>Intră în aplicație</Txt>
                  <RezIcon name="arrow" size={20} color={selectedTrack ? '#FFFFFF' : c.textFaint} />
                </>
              )}
            </Press>
          </>
        )}
      </ScreenContent>
    </ScreenBackground>
  )
}

function HelpJourney() {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={styles.journey}>
      <View style={[styles.problemCard, { backgroundColor: c.chalkDark, borderColor: c.text }]}>
        <View style={styles.problemTopline}>
          <View style={[styles.cameraDot, { backgroundColor: c.bubblyYellow }]}>
            <RezIcon name="camera" size={14} color={c.text} accent={c.bubblyRed} />
          </View>
          <Txt weight="bold" size={9.5} color={c.bubblyYellow} style={{ fontFamily: theme.font.mono, letterSpacing: 0.8 }}>
            PROBLEMA TA
          </Txt>
        </View>
        <Txt size={22} color="#FFFFFF" style={[styles.equation, { fontFamily: theme.font.serif }]}>2x + 5 = 17</Txt>
        <Txt size={11.5} color="rgba(255,255,255,0.72)">Cum încep?</Txt>
      </View>

      <View style={styles.choiceLabel}>
        <View style={[styles.choiceRule, { backgroundColor: c.cardEdge }]} />
        <Txt weight="bold" size={10} color={c.textMuted} style={{ fontFamily: theme.font.mono, letterSpacing: 0.65 }}>ALEGI AJUTORUL</Txt>
        <View style={[styles.choiceRule, { backgroundColor: c.cardEdge }]} />
      </View>

      <View style={styles.helpChoices}>
        <HelpChoice icon="teacher" title="Indiciu" copy="Primul pas" color={c.bubblyYellow} border={c.bubblyYellowDark} darkText />
        <HelpChoice icon="verified" title="Verificare" copy="Ce ai scris" color={c.bubblyBlue} border={c.bubblyBlueDark} />
        <HelpChoice icon="solve" title="Rezolvare" copy="Doar la cerere" color={c.bubblyGreen} border={c.bubblyGreenDark} />
      </View>

      <View style={[styles.solutionPromise, { backgroundColor: c.accentSoft }]}>
        <RezIcon name="shield" size={18} color={c.bubblyRedDark} accent={c.bubblyRed} />
        <Txt weight="bold" size={12} color={c.bubblyRedDark} style={styles.promiseCopy}>
          Soluția rămâne ascunsă până când o ceri.
        </Txt>
      </View>
    </View>
  )
}

function HelpChoice({
  icon,
  title,
  copy,
  color,
  border,
  darkText = false,
}: {
  icon: RezIconName
  title: string
  copy: string
  color: string
  border: string
  darkText?: boolean
}) {
  return (
    <View style={[styles.helpChoice, { backgroundColor: color, borderColor: border }]}>
      <RezIcon name={icon} size={20} color={darkText ? '#193149' : '#FFFFFF'} accent={darkText ? '#E94D45' : '#FFFFFF'} />
      <Txt weight="bold" size={11.5} color={darkText ? '#193149' : '#FFFFFF'}>{title}</Txt>
      <Txt size={9.5} color={darkText ? 'rgba(25,49,73,0.72)' : 'rgba(255,255,255,0.82)'} style={styles.helpCopy}>{copy}</Txt>
    </View>
  )
}

function OnboardingHeader({
  eyebrow,
  title,
  copy,
  onBack,
}: {
  eyebrow: string
  title: string
  copy: string
  onBack: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Entrance>
      <Press onPress={onBack} accessibilityLabel="Înapoi" style={styles.back}>
        <RezIcon name="back" size={21} color={c.text} />
      </Press>
      <Txt weight="bold" size={11} color={c.bubblyRed} style={{ fontFamily: theme.font.mono, letterSpacing: 1 }}>
        {eyebrow}
      </Txt>
      <Txt style={[styles.stepTitle, { color: c.text, fontFamily: theme.font.display }]}>{title}</Txt>
      <Txt size={14} color={c.textMuted} style={styles.stepCopy}>{copy}</Txt>
    </Entrance>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { justifyContent: 'space-between' },
  stepFill: { flex: 1 },
  welcomeScroll: { flex: 1 },
  welcomePage: { gap: 16, paddingBottom: 14 },
  brand: { alignItems: 'center', flexDirection: 'row' },
  hero: { borderRadius: 28, borderWidth: 3, borderBottomWidth: 8, overflow: 'hidden', padding: 18 },
  title: { fontSize: 31, letterSpacing: -1.1, lineHeight: 35 },
  subtitle: { lineHeight: 20, marginTop: 8, maxWidth: 560 },
  journey: { marginTop: 18 },
  problemCard: { alignSelf: 'center', borderRadius: 18, borderWidth: 2.5, borderBottomWidth: 6, paddingHorizontal: 17, paddingVertical: 12, transform: [{ rotate: '-1.2deg' }], width: '88%' },
  problemTopline: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  cameraDot: { alignItems: 'center', borderRadius: 99, height: 26, justifyContent: 'center', width: 26 },
  equation: { lineHeight: 29, marginBottom: 2, marginTop: 6 },
  choiceLabel: { alignItems: 'center', flexDirection: 'row', gap: 8, marginVertical: 13 },
  choiceRule: { borderRadius: 99, flex: 1, height: 2 },
  helpChoices: { flexDirection: 'row', gap: 8 },
  helpChoice: { alignItems: 'center', borderRadius: 17, borderWidth: 2, borderBottomWidth: 5, flex: 1, minHeight: 88, paddingHorizontal: 3, paddingVertical: 9 },
  helpCopy: { lineHeight: 12, marginTop: 2, textAlign: 'center' },
  solutionPromise: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 8, marginTop: 13, paddingHorizontal: 12, paddingVertical: 10 },
  promiseCopy: { flex: 1, lineHeight: 16 },
  footer: { flexShrink: 0, gap: 4, paddingTop: 8 },
  primary: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 64,
  },
  secondary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  back: { alignItems: 'center', height: 44, justifyContent: 'center', marginBottom: 22, width: 44 },
  stepTitle: { fontSize: 31, letterSpacing: -1.05, lineHeight: 36, marginTop: 7 },
  stepCopy: { lineHeight: 20, marginTop: 7 },
  selectionScroll: { flex: 1, marginVertical: 12 },
  selectionList: { flexGrow: 1, gap: 12, justifyContent: 'center', paddingBottom: 18, paddingTop: 8 },
  selection: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderBottomWidth: 7,
    flexDirection: 'row',
    gap: 14,
    minHeight: 104,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionIcon: { alignItems: 'center', borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, height: 54, justifyContent: 'center', width: 54 },
  profileNumber: { alignItems: 'center', borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, height: 50, justifyContent: 'center', width: 50 },
  optionEyebrow: { letterSpacing: 0.45, marginBottom: 3 },
  optionCopy: { lineHeight: 17, marginTop: 3 },
  radio: { alignItems: 'center', borderRadius: 99, borderWidth: 2, height: 26, justifyContent: 'center', width: 26 },
  error: { lineHeight: 18, paddingBottom: 12, textAlign: 'center' },
})
