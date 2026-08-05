import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import { useProduct } from '../product/ProductProvider'
import { BAC_TRACKS, BAC_TRACK_LABELS, type ExamGoal } from '../product/profile'
import Overlay from '../components/ui/Overlay'
import PanelHeader from '../components/ui/PanelHeader'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import Txt from '../components/ui/Txt'
import { useToast } from '../components/ui/Toast'

const goalOptions: Array<{ id: 'en' | 'bac' | 'none'; value: ExamGoal; label: string; copy: string; icon: RezIconName; accent: 'red' | 'blue' | 'yellow' }> = [
  { id: 'en', value: 'en', label: 'Evaluarea Națională', copy: 'Programa și subiectele oficiale pentru clasa a VIII-a', icon: 'exam-en', accent: 'red' },
  { id: 'bac', value: 'bac', label: 'Bacalaureat', copy: 'Conținut adaptat profilului și programei tale', icon: 'exam-bac', accent: 'blue' },
  { id: 'none', value: null, label: 'Matematică, fără examen', copy: 'Rezolvare și exerciții fără programă impusă', icon: 'workspace', accent: 'yellow' },
]

const bacProfiles = BAC_TRACKS

export default function GoalSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { examGoal, bacTrack, setExamGoal, saving } = useProduct()

  return (
    <Overlay open={open} onClose={onClose} align="bottom">
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + 18 },
        ]}
      >
        <PanelHeader
          eyebrow="PREGĂTIREA MEA"
          title="Alege obiectivul tău"
          icon="compass"
          onClose={onClose}
          closeLabel="Închide"
        />

        <View style={styles.content}>
          <View style={styles.goalList}>
            {goalOptions.map((option) => {
              const selected = examGoal === option.value
              const accentBg = option.accent === 'red' ? c.bubblyRed
                : option.accent === 'blue' ? c.bubblyBlue
                : c.bubblyYellow
              const accentDark = option.accent === 'red' ? c.bubblyRedDark
                : option.accent === 'blue' ? c.bubblyBlueDark
                : c.bubblyYellowDark
              const accentSoft = option.accent === 'red' ? c.accentSoft
                : option.accent === 'blue' ? '#E4F6FF'
                : c.sunnySoft

              return (
                <Press
                  key={option.id}
                  onPress={() => {
                    setExamGoal(
                      option.value,
                      option.value === 'bac' ? bacTrack ?? 'mate_info' : null,
                    ).catch(() => toast.show('Nu am putut salva obiectivul.', 'alert-triangle'))
                  }}
                  disabled={saving}
                  pressDepth={1.5}
                  style={[
                    styles.goalOption,
                    selected
                      ? { backgroundColor: accentSoft, borderColor: accentDark }
                      : { backgroundColor: c.bgElevated, borderColor: 'transparent' },
                  ]}
                >
                  <View style={[styles.goalOptionIcon, { backgroundColor: accentBg, borderColor: accentDark }]}>
                    <RezIcon name={option.icon} size={21} color={option.accent === 'yellow' ? c.text : '#FFFFFF'} accent={option.accent === 'yellow' ? c.bubblyRed : '#FFFFFF'} />
                  </View>
                  <View style={styles.flex}>
                    <Txt weight="bold" size={14.5} color={c.text} style={styles.noBreak}>{option.label}</Txt>
                    <Txt size={11.8} color={c.textMuted} style={styles.goalOptionCopy}>{option.copy}</Txt>
                  </View>
                  <View style={[styles.goalCheck, { borderColor: selected ? accentDark : c.textFaint, backgroundColor: selected ? accentBg : 'transparent' }]}>
                    {selected && <RezIcon name="check" size={13} color="#FFFFFF" />}
                  </View>
                </Press>
              )
            })}
          </View>

          {examGoal === 'bac' && (
            <View style={[styles.profileSection, { borderColor: c.cardEdge }]}>
              <View style={styles.profileLabel}>
                <RezIcon name="exam-bac" size={15} color={c.textMuted} accent={c.bubblyRed} />
                <Txt weight="bold" size={11.5} color={c.textMuted} style={{ fontFamily: theme.font.mono, letterSpacing: 0.8 }}>
                  PROFIL BAC
                </Txt>
              </View>
              {bacProfiles.map((profile, index) => {
                const active = profile === bacTrack
                return (
                  <Press
                    key={profile}
                    onPress={() => {
                      setExamGoal('bac', profile).catch(() => toast.show('Nu am putut salva profilul.', 'alert-triangle'))
                    }}
                    disabled={saving}
                    pressDepth={1.5}
                    style={[
                      styles.profileRow,
                      index < bacProfiles.length - 1 && { borderBottomColor: 'rgba(25,49,73,0.1)', borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <View style={[
                      styles.profileDot,
                      { backgroundColor: active ? c.bubblyGreen : c.surfaceAlt, borderColor: active ? c.bubblyGreenDark : c.cardEdge },
                    ]}>
                      {active && <RezIcon name="check" size={13} color="#FFFFFF" />}
                    </View>
                    <Txt
                      weight={active ? 'bold' : 'medium'}
                      size={14}
                      color={active ? c.text : c.textMuted}
                      style={styles.flex}
                    >
                      {BAC_TRACK_LABELS[profile]}
                    </Txt>
                  </Press>
                )
              })}
            </View>
          )}
        </View>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    maxHeight: '90%',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  flex: {
    flex: 1,
  },
  noBreak: {
    flexShrink: 1,
  },
  goalList: {
    gap: 8,
  },
  goalOption: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  goalOptionIcon: {
    alignItems: 'center',
    borderRadius: 14,
    borderBottomWidth: 3,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  goalOptionCopy: {
    marginTop: 2,
    opacity: 0.8,
  },
  goalCheck: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  profileSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  profileLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  profileDot: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
})
