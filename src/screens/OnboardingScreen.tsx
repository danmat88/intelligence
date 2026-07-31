import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Press from '../components/ui/Press'
import ProfessorMark from '../components/ui/ProfessorMark'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import Txt from '../components/ui/Txt'
import { useProduct, type BacProfile, type LearningGoal } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'

type Step = 'welcome' | 'goal' | 'profile'

const goals: Array<{
  value: Exclude<LearningGoal, null>
  title: string
  copy: string
  icon: RezIconName
}> = [
  { value: 'en', title: 'Evaluare Națională', copy: 'Matematică · clasa a VIII-a', icon: 'exam-en' },
  { value: 'bac', title: 'Bacalaureat', copy: 'Alegi profilul la pasul următor', icon: 'exam-bac' },
  { value: 'general', title: 'Doar ajutor la matematică', copy: 'Fără obiectiv de examen', icon: 'workspace' },
]

const profiles: BacProfile[] = [
  'Mate-info',
  'Științe ale naturii',
  'Tehnologic',
  'Pedagogic',
]

export default function OnboardingScreen({ onSolve }: { onSolve: () => void }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const { setGoal, setBacProfile } = useProduct()
  const c = theme.colors
  const [step, setStep] = useState<Step>('welcome')

  const chooseGoal = (goal: Exclude<LearningGoal, null>) => {
    if (goal === 'bac') {
      setStep('profile')
      return
    }
    setGoal(goal)
  }

  return (
    <ScreenBackground>
      <ScreenContent style={[styles.page, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
        {step === 'welcome' ? (
          <>
            <View style={styles.brand}>
              <View style={[styles.mascot, { backgroundColor: c.sunnySoft }]}>
                <ProfessorMark style={styles.professor} />
              </View>
              <Txt style={[styles.wordmark, { color: c.text, fontFamily: theme.font.display }]}>
                Profu’ de Mate
              </Txt>
            </View>

            <View style={styles.welcomeCopy}>
              <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>
                Matematica devine clară.
              </Txt>
              <Txt size={15} color={c.textMuted} style={styles.subtitle}>
                Adu o problemă sau pregătește-te pentru examen cu explicații în română.
              </Txt>
            </View>

            <View style={styles.benefits}>
              <Benefit icon="camera" title="Fotografiezi sau scrii" copy="Profu’ citește enunțul complet." />
              <Benefit icon="teacher" title="Înțelegi metoda" copy="Primești pașii și explicația, nu doar rezultatul." />
              <Benefit icon="verified" title="Verifici și păstrezi" copy="Rezultatul este verificat și salvat în caiet." />
            </View>

            <View style={styles.footer}>
              <Press onPress={() => setStep('goal')} pressDepth={4} style={[styles.primary, { backgroundColor: c.bubblyGreen, borderColor: c.bubblyGreenDark, borderBottomColor: c.bubblyGreenDark }]}>
                <Txt weight="bold" size={15.5} color="#FFFFFF">Alege obiectivul</Txt>
                <RezIcon name="arrow" size={20} color="#FFFFFF" />
              </Press>
              <Press onPress={onSolve} pressDepth={2} style={styles.secondary}>
                <RezIcon name="solve" size={19} color={c.bubblyRed} accent={c.bubblyYellow} />
                <Txt weight="bold" size={14} color={c.bubblyRed}>Rezolvă acum, fără configurare</Txt>
              </Press>
            </View>
          </>
        ) : step === 'goal' ? (
          <>
            <OnboardingHeader
              eyebrow="PASUL 1 DIN 2"
              title="Pentru ce vrei să lucrăm?"
              copy="Alegerea personalizează pregătirea. Solverul rămâne disponibil pentru orice problemă."
              onBack={() => setStep('welcome')}
            />
            <View style={styles.selectionList}>
              {goals.map((goal) => (
                <Press
                  key={goal.value}
                  onPress={() => chooseGoal(goal.value)}
                  pressDepth={3.5}
                  style={[styles.selection, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
                >
                  <View style={[styles.selectionIcon, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark }]}>
                    <RezIcon name={goal.icon} size={24} color={c.text} accent={c.bubblyRed} />
                  </View>
                  <View style={styles.flex}>
                    <Txt weight="bold" size={16} color={c.text}>{goal.title}</Txt>
                    <Txt size={12.5} color={c.textMuted}>{goal.copy}</Txt>
                  </View>
                  <RezIcon name="chevron" size={17} color={c.textFaint} />
                </Press>
              ))}
            </View>
          </>
        ) : (
          <>
            <OnboardingHeader
              eyebrow="PASUL 2 DIN 2"
              title="Ce profil de BAC ai?"
              copy="Fiecare profil are programă și structură diferite."
              onBack={() => setStep('goal')}
            />
            <View style={styles.selectionList}>
              {profiles.map((profile, index) => (
                <Press
                  key={profile}
                  onPress={() => {
                    setBacProfile(profile)
                    setGoal('bac')
                  }}
                  pressDepth={3.5}
                  style={[styles.selection, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}
                >
                  <View style={[styles.profileNumber, { backgroundColor: index === 0 ? c.bubblyYellow : c.surfaceAlt, borderColor: index === 0 ? c.bubblyYellowDark : c.cardEdge }]}>
                    <Txt weight="bold" size={13} color={c.text}>{index + 1}</Txt>
                  </View>
                  <Txt weight="bold" size={16} color={c.text} style={styles.flex}>{profile}</Txt>
                  <RezIcon name="chevron" size={17} color={c.textFaint} />
                </Press>
              ))}
            </View>
          </>
        )}
      </ScreenContent>
    </ScreenBackground>
  )
}

function Benefit({ icon, title, copy }: { icon: RezIconName; title: string; copy: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={styles.benefit}>
      <View style={[styles.benefitIcon, { backgroundColor: c.sunnySoft, borderColor: c.bubblyYellowDark }]}>
        <RezIcon name={icon} size={21} color={c.text} accent={c.bubblyRed} />
      </View>
      <View style={styles.flex}>
        <Txt weight="bold" size={14.5} color={c.text}>{title}</Txt>
        <Txt size={12.5} color={c.textMuted} style={styles.benefitCopy}>{copy}</Txt>
      </View>
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
    <View>
      <Press onPress={onBack} accessibilityLabel="Înapoi" style={styles.back}>
        <RezIcon name="back" size={21} color={c.text} />
      </Press>
      <Txt weight="bold" size={11} color={c.bubblyRed} style={{ fontFamily: theme.font.mono, letterSpacing: 1 }}>
        {eyebrow}
      </Txt>
      <Txt style={[styles.stepTitle, { color: c.text, fontFamily: theme.font.display }]}>{title}</Txt>
      <Txt size={14} color={c.textMuted} style={styles.stepCopy}>{copy}</Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  mascot: { alignItems: 'center', borderRadius: 18, borderWidth: 2, borderBottomWidth: 3.5, borderColor: '#E5B200', height: 54, justifyContent: 'flex-end', overflow: 'hidden', width: 54 },
  professor: { height: 61, width: 61 },
  wordmark: { fontSize: 25, letterSpacing: -0.9 },
  welcomeCopy: { marginTop: 20 },
  title: { fontSize: 35, letterSpacing: -1.3, lineHeight: 40 },
  subtitle: { lineHeight: 22, marginTop: 8, maxWidth: 520 },
  benefits: { gap: 13, marginVertical: 24 },
  benefit: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  benefitIcon: { alignItems: 'center', borderRadius: 15, borderWidth: 1.5, height: 46, justifyContent: 'center', width: 46 },
  benefitCopy: { lineHeight: 17, marginTop: 2 },
  footer: { gap: 8 },
  primary: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
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
  selectionList: { flex: 1, gap: 12, justifyContent: 'center', paddingBottom: 50 },
  selection: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderBottomWidth: 4.5,
    flexDirection: 'row',
    gap: 13,
    minHeight: 76,
    paddingHorizontal: 14,
  },
  selectionIcon: { alignItems: 'center', borderRadius: 15, borderWidth: 1.5, height: 48, justifyContent: 'center', width: 48 },
  profileNumber: { alignItems: 'center', borderRadius: 15, borderWidth: 1.5, height: 44, justifyContent: 'center', width: 44 },
})
