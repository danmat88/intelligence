import { useState } from 'react'
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ContextHeader from '../components/ui/ContextHeader'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import Txt from '../components/ui/Txt'
import { useToast } from '../components/ui/Toast'
import { useI18n } from '../i18n'
import { useTheme } from '../theme/ThemeProvider'
import { useProduct, type BacProfile, type LearningGoal } from '../product/ProductProvider'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const goalOptions: Array<{ value: Exclude<LearningGoal, null>; label: string; icon: RezIconName; accent: 'red' | 'blue' | 'yellow' }> = [
  { value: 'en', label: 'Evaluare Națională', icon: 'exam-en', accent: 'red' },
  { value: 'bac', label: 'Bacalaureat', icon: 'exam-bac', accent: 'blue' },
  { value: 'general', label: 'Matematică generală', icon: 'workspace', accent: 'yellow' },
]
const bacProfiles: BacProfile[] = ['Mate-info', 'Științe ale naturii', 'Tehnologic', 'Pedagogic']

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors
  const { user, signIn, signingIn, signOut, deleteAccount } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const { goal, bacProfile, setGoal, setBacProfile } = useProduct()
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!user) return null
  const isGuest = user.isAnonymous

  const doDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      onBack()
      toast.show(t('settings.deleted'), 'check')
    } catch {
      toast.show(t('settings.deleteError'), 'alert-triangle')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ScreenBackground>
      <ContextHeader eyebrow="CONT" title="Cont și setări" onBack={onBack} backLabel="Înapoi" />
      <ScreenContent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        >
          {/* ─── Identity Section ─── */}
          {isGuest ? (
            <View style={[styles.guestCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
              <View style={styles.guestTop}>
                <View style={[styles.guestAvatar, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark }]}>
                  <RezIcon name="user" size={30} color={c.text} accent={c.bubblyRed} />
                </View>
                <View style={styles.guestInfo}>
                  <Txt weight="bold" size={17} color={c.text} style={styles.noBreak}>
                    {t('settings.guest.title')}
                  </Txt>
                  <Txt size={12.5} color={c.textMuted} style={styles.guestSub}>
                    {t('settings.guest.sub')}
                  </Txt>
                </View>
              </View>
              <Press
                onPress={signIn}
                pressDepth={4}
                disabled={signingIn}
                style={[styles.googleBtn, { backgroundColor: c.chalkDark, borderColor: '#0A2926', borderBottomColor: '#071F1D' }]}
              >
                {signingIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <View style={styles.googleCircle}>
                      <Txt weight="extrabold" size={15} color={c.chalkDark} style={styles.googleG}>G</Txt>
                    </View>
                    <Txt weight="bold" size={15} color="#FFFFFF">Continuă cu Google</Txt>
                  </>
                )}
              </Press>
            </View>
          ) : (
            <View style={[styles.identityCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
              <View style={styles.identityRow}>
                {user.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark }]}>
                    <RezIcon name="user" size={26} color={c.text} accent={c.bubblyRed} />
                  </View>
                )}
                <View style={styles.flex}>
                  <Txt numberOfLines={1} weight="bold" size={17} color={c.text}>{user.name ?? user.email}</Txt>
                  <Txt numberOfLines={1} size={13} color={c.textMuted} style={{ marginTop: 2 }}>{user.email}</Txt>
                </View>
              </View>
            </View>
          )}

          {/* ─── Learning Goal Section ─── */}
          <SectionLabel title="OBIECTIV DE ÎNVĂȚARE" />
          <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
            <View style={styles.goalGrid}>
              {goalOptions.map((option) => {
                const selected = goal === option.value
                const accentBg = option.accent === 'red' ? c.bubblyRed
                  : option.accent === 'blue' ? c.bubblyBlue
                  : c.bubblyYellow
                const accentDark = option.accent === 'red' ? c.bubblyRedDark
                  : option.accent === 'blue' ? c.bubblyBlueDark
                  : c.bubblyYellowDark
                return (
                  <Press
                    key={option.value}
                    onPress={() => setGoal(option.value)}
                    pressDepth={3}
                    style={[
                      styles.goalOption,
                      selected
                        ? { backgroundColor: accentBg, borderColor: accentDark, borderBottomColor: accentDark }
                        : { backgroundColor: c.bgElevated, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' },
                    ]}
                  >
                    <RezIcon name={option.icon} size={18} color={selected ? '#FFFFFF' : c.text} accent={selected ? '#FFFFFF' : c.bubblyRed} />
                    <Txt weight="bold" size={13} color={selected ? '#FFFFFF' : c.text} style={styles.noBreak}>
                      {option.label}
                    </Txt>
                    {selected && <RezIcon name="check" size={15} color="#FFFFFF" />}
                  </Press>
                )
              })}
            </View>

            {goal === 'bac' && (
              <View style={styles.profileSection}>
                <View style={styles.profileLabel}>
                  <RezIcon name="exam-bac" size={15} color={c.textMuted} accent={c.bubblyRed} />
                  <Txt weight="bold" size={11.5} color={c.textMuted} style={{ fontFamily: theme.font.mono, letterSpacing: 0.8 }}>
                    PROFIL BAC
                  </Txt>
                </View>
                {bacProfiles.map((profile, index) => {
                  const active = profile === bacProfile
                  return (
                    <Press
                      key={profile}
                      onPress={() => setBacProfile(profile)}
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
                        {profile}
                      </Txt>
                    </Press>
                  )
                })}
              </View>
            )}
          </View>

          {/* ─── Information Section ─── */}
          <SectionLabel title="INFORMAȚII" />
          <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
            <SettingsRow
              icon="privacy"
              label="Politica de confidențialitate"
              onPress={() => Linking.openURL('https://rezolvo.web.app/privacy')}
              last={false}
            />
            <SettingsRow
              icon="terms"
              label="Termeni și condiții"
              onPress={() => Linking.openURL('https://rezolvo.web.app/terms')}
              last
            />
          </View>

          {/* ─── Account Actions Section ─── */}
          {!isGuest && (
            <>
              <SectionLabel title="CONT" />
              <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
                <SettingsRow
                  icon="logout"
                  label="Deconectează-te"
                  onPress={() => signOut().then(() => {
                    onBack()
                    toast.show(t('auth.signedOut'))
                  })}
                  last={false}
                />
                <SettingsRow
                  icon="trash"
                  label={deleting ? 'Șterg contul…' : 'Șterge definitiv contul'}
                  danger
                  disabled={deleting}
                  onPress={() => setConfirming(true)}
                  last
                />
              </View>
            </>
          )}

          {/* ─── Version Footer ─── */}
          <View style={styles.versionWrap}>
            <View style={[styles.versionPill, { backgroundColor: c.surfaceAlt, borderColor: c.cardEdge }]}>
              <RezIcon name="workspace" size={14} color={c.textFaint} />
              <Txt size={11.5} weight="semibold" color={c.textFaint} style={{ fontFamily: theme.font.mono }}>
                v1.0
              </Txt>
            </View>
            <Txt size={11} color={c.textFaint}>
              Profu' de Mate
            </Txt>
          </View>
        </ScrollView>
      </ScreenContent>

      <ConfirmDialog
        open={confirming}
        title={t('settings.confirm.title')}
        message={t('settings.confirm.message')}
        confirmLabel={t('settings.confirm.cta')}
        cancelLabel={t('settings.confirm.cancel')}
        onConfirm={doDelete}
        onClose={() => setConfirming(false)}
      />
    </ScreenBackground>
  )
}

/* ─── Sub-components ─── */

function SectionLabel({ title }: { title: string }) {
  const { theme } = useTheme()
  return (
    <Txt
      weight="bold"
      size={11}
      color={theme.colors.bubblyRed}
      style={[styles.sectionLabel, { fontFamily: theme.font.mono, letterSpacing: 1.2 }]}
    >
      {title}
    </Txt>
  )
}

function SettingsRow({
  icon,
  label,
  onPress,
  danger = false,
  disabled = false,
  last = false,
}: {
  icon: RezIconName
  label: string
  onPress: () => void
  danger?: boolean
  disabled?: boolean
  last?: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const color = danger ? c.danger : c.text
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.row,
        !last && { borderBottomColor: 'rgba(25,49,73,0.1)', borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? c.dangerSoft : c.sunnySoft }]}>
        <RezIcon name={icon} size={18} color={color} accent={danger ? c.danger : c.bubblyRed} />
      </View>
      <Txt weight="semibold" size={14.5} color={color} style={[styles.flex, styles.noBreak]}>{label}</Txt>
      <RezIcon name="chevron" size={16} color={c.textFaint} />
    </Press>
  )
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noBreak: { flexShrink: 1 },
  content: { paddingBottom: 32, paddingTop: 8 },

  // Guest card
  guestCard: {
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    gap: 16,
    padding: 20,
  },
  guestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  guestAvatar: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  guestInfo: {
    flex: 1,
  },
  guestSub: {
    lineHeight: 17,
    marginTop: 3,
  },
  googleBtn: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    minHeight: 64,
  },
  googleCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  googleG: {
    textAlign: 'center',
  },

  // Signed-in identity
  identityCard: {
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    padding: 18,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  avatar: { borderRadius: 24, height: 52, width: 52 },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderBottomWidth: 6,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },

  // Section labels
  sectionLabel: {
    marginBottom: 8,
    marginTop: 28,
    paddingHorizontal: 4,
  },

  // Grouped card container for settings rows
  groupCard: {
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    overflow: 'hidden',
  },

  // Goal options
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  goalOption: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 3,
    borderBottomWidth: 6,
    flexDirection: 'row',
    gap: 7,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // BAC profile
  profileSection: {
    borderTopColor: 'rgba(25,49,73,0.1)',
    borderTopWidth: 1.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  profileLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 48,
    paddingVertical: 4,
  },
  profileDot: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 3,
    borderBottomWidth: 4,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },

  // Settings rows
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },

  // Version footer
  versionWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: 32,
    paddingBottom: 8,
  },
  versionPill: {
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 3,
    borderBottomWidth: 5,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
})
