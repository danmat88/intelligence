import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { useAuth } from '../auth/AuthProvider'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ContextHeader from '../components/ui/ContextHeader'
import Entrance from '../components/ui/Entrance'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import ScreenContent from '../components/ui/ScreenContent'
import Txt from '../components/ui/Txt'
import { useToast } from '../components/ui/Toast'
import { useI18n } from '../i18n'
import { useTheme } from '../theme/ThemeProvider'
import { useProduct } from '../product/ProductProvider'
import { BAC_TRACKS, BAC_TRACK_LABELS, type BacTrack, type ExamGoal } from '../product/profile'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { readTelemetryConsent, setTelemetryConsent } from '../lib/telemetry'


export default function SettingsScreen({ onBack, onChangeGoal }: { onBack: () => void, onChangeGoal: () => void }) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const c = theme.colors
  const { user, signIn, signingIn, signOut, deleteAccount, exportAccount } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const { examGoal, bacTrack, setExamGoal, saving } = useProduct()
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [diagnostics, setDiagnostics] = useState(false)
  const [changingDiagnostics, setChangingDiagnostics] = useState(false)

  useEffect(() => {
    void readTelemetryConsent().then(setDiagnostics)
  }, [])

  if (!user) return null
  const isGuest = user.isAnonymous

  const doDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      toast.show(isGuest ? 'Sesiune și date șterse' : t('settings.deleted'), 'check')
    } catch {
      toast.show(t('settings.deleteError'), 'alert-triangle')
    } finally {
      setDeleting(false)
    }
  }

  const doExport = async () => {
    setExporting(true)
    let uri: string | null = null
    try {
      const data = await exportAccount()
      const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory
      if (!directory || !(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable')
      uri = `${directory}profu-de-mate-date-${new Date().toISOString().slice(0, 10)}.json`
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2), { encoding: FileSystem.EncodingType.UTF8 })
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Exportă datele Profu’ de Mate' })
    } catch {
      toast.show('Nu am putut exporta datele. Încearcă din nou.', 'alert-triangle')
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {})
      setExporting(false)
    }
  }

  const toggleDiagnostics = async () => {
    const next = !diagnostics
    const previous = diagnostics
    setDiagnostics(next)
    setChangingDiagnostics(true)
    try {
      await setTelemetryConsent(next)
      toast.show(
        next ? 'Datele opționale de diagnostic sunt pornite.' : 'Datele opționale de diagnostic sunt oprite.',
        'check',
      )
    } catch {
      setDiagnostics(previous)
      toast.show('Nu am putut salva preferința.', 'alert-triangle')
    } finally {
      setChangingDiagnostics(false)
    }
  }

  return (
    <ScreenBackground>
      <ContextHeader eyebrow="PROFIL" title="Setări" onBack={onBack} backLabel="Înapoi" />
      <ScreenContent>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        >
          <Entrance>
          {isGuest ? (
            <View style={[styles.guestCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: '#D0D0D0' }]}>
              <View style={styles.guestTop}>
                <View style={[styles.guestAvatar, { backgroundColor: c.bubblyYellow, borderColor: c.bubblyYellowDark }]}>
                  <RezIcon name="user" size={30} color={c.text} accent={c.bubblyRed} />
                </View>
                <View style={styles.guestInfo}>
                  <View style={[styles.accountBadge, { backgroundColor: c.sunnySoft }]}>
                    <Txt weight="bold" size={9.5} color={c.bubblyYellowDark} style={{ fontFamily: theme.font.mono, letterSpacing: 0.7 }}>MOD VIZITATOR</Txt>
                  </View>
                  <Txt weight="bold" size={18} color={c.text} style={styles.noBreak}>Contul tău</Txt>
                  <Txt size={12.5} color={c.textMuted} style={styles.guestSub}>
                    Conectează-te pentru a-ți păstra munca atunci când schimbi dispozitivul.
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
                  <View style={[styles.accountBadge, { backgroundColor: c.successSoft }]}>
                    <RezIcon name="verified" size={12} color={c.bubblyGreenDark} accent={c.bubblyGreen} />
                    <Txt weight="bold" size={9.5} color={c.bubblyGreenDark} style={{ fontFamily: theme.font.mono, letterSpacing: 0.7 }}>CONT GOOGLE</Txt>
                  </View>
                  <Txt numberOfLines={1} weight="bold" size={17} color={c.text}>{user.name ?? user.email}</Txt>
                  <Txt numberOfLines={1} size={13} color={c.textMuted} style={{ marginTop: 2 }}>{user.email}</Txt>
                </View>
              </View>
            </View>
          )}
          </Entrance>

          <Entrance delay={45}>
            <SectionLabel title="PREGĂTIREA MEA" />
            <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge }]}>
              <SettingsRow
                icon={examGoal === 'en' ? 'exam-en' : examGoal === 'bac' ? 'exam-bac' : 'workspace'}
                label="Obiectivul curent"
                copy={examGoal === 'en' ? 'Evaluarea Națională' : examGoal === 'bac' ? `Bacalaureat · ${BAC_TRACK_LABELS[bacTrack ?? 'mate_info']}` : 'Matematică, fără examen'}
                onPress={onChangeGoal}
                last
              />
            </View>
          </Entrance>

          <Entrance delay={90}>
            <SectionLabel title="CONFIDENȚIALITATE" />
            <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge }]}>
              <SettingsToggleRow
                icon="privacy"
                label="Diagnostic opțional"
                copy="Ne ajută să găsim erorile. Nu include enunțurile sau răspunsurile tale."
                value={diagnostics}
                disabled={changingDiagnostics}
                onChange={() => void toggleDiagnostics()}
              />
              <SettingsRow
                icon="privacy"
                label="Politica de confidențialitate"
                copy="Cum sunt protejate și folosite datele"
                onPress={() => Linking.openURL('https://rezolvo.web.app/privacy')}
                last={false}
              />
              <SettingsRow
                icon="terms"
                label="Termeni și condiții"
                copy="Regulile de utilizare ale aplicației"
                onPress={() => Linking.openURL('https://rezolvo.web.app/terms')}
                last
              />
            </View>
          </Entrance>

          <Entrance delay={135}>
            <SectionLabel title="CONT ȘI DATE" />
            <View style={[styles.groupCard, { backgroundColor: c.surface, borderColor: c.cardEdge, borderBottomColor: c.cardEdge }]}>
            <SettingsRow
              icon="download"
              label={exporting ? 'Pregătesc exportul…' : 'Exportă datele mele'}
              copy="Primești o copie a informațiilor contului"
              disabled={exporting || deleting}
              onPress={() => void doExport()}
              last={false}
            />
            {!isGuest && (
                <SettingsRow
                  icon="logout"
                  label="Deconectează-te"
                  copy="Datele sincronizate rămân în cont"
                  onPress={() => signOut().then(() => toast.show(t('auth.signedOut')))}
                  last={false}
                />
            )}
            <SettingsRow
              icon="trash"
              label={deleting ? 'Șterg datele…' : isGuest ? 'Șterge sesiunea și datele' : 'Șterge definitiv contul'}
              copy="Acțiune permanentă, cu confirmare"
              danger
              disabled={deleting || exporting}
              onPress={() => setConfirming(true)}
              last
            />
            </View>
          </Entrance>

          <Entrance delay={180} style={styles.versionWrap}>
            <View style={[styles.versionPill, { backgroundColor: c.surfaceAlt, borderColor: c.cardEdge }]}>
              <RezIcon name="workspace" size={14} color={c.textFaint} />
              <Txt size={11.5} weight="semibold" color={c.textFaint} style={{ fontFamily: theme.font.mono }}>
                v1.0
              </Txt>
            </View>
            <Txt size={11} color={c.textFaint}>
              Profu’ de Mate
            </Txt>
          </Entrance>
        </ScrollView>
      </ScreenContent>

      <ConfirmDialog
        open={confirming}
        title={isGuest ? 'Ștergi sesiunea?' : t('settings.confirm.title')}
        message={isGuest
          ? 'Șterge definitiv sesiunea anonimă, problemele, pozele și rezultatele asociate. Nu există anulare.'
          : t('settings.confirm.message')}
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
  copy,
  onPress,
  danger = false,
  disabled = false,
  last = false,
}: {
  icon: RezIconName
  label: string
  copy?: string
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
      <View style={styles.flex}>
        <Txt weight="semibold" size={14.5} color={color} style={styles.noBreak}>{label}</Txt>
        {copy ? <Txt size={11.8} color={danger ? c.danger : c.textMuted} style={styles.rowCopy}>{copy}</Txt> : null}
      </View>
      <RezIcon name="chevron" size={16} color={c.textFaint} />
    </Press>
  )
}

function SettingsToggleRow({
  icon,
  label,
  copy,
  value,
  disabled,
  onChange,
}: {
  icon: RezIconName
  label: string
  copy: string
  value: boolean
  disabled: boolean
  onChange: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={[styles.row, styles.toggleRow, { borderBottomColor: 'rgba(25,49,73,0.1)' }]}>
      <View style={[styles.rowIcon, { backgroundColor: c.successSoft }]}>
        <RezIcon name={icon} size={18} color={c.bubblyGreenDark} accent={c.bubblyGreen} />
      </View>
      <View style={styles.flex}>
        <Txt weight="semibold" size={14.5} color={c.text}>{label}</Txt>
        <Txt size={11.8} color={c.textMuted} style={styles.rowCopy}>{copy}</Txt>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        value={value}
        trackColor={{ false: c.surfaceAlt, true: c.bubblyGreen }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={c.surfaceAlt}
      />
    </View>
  )
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noBreak: { flexShrink: 1 },
  content: { paddingBottom: 32, paddingTop: 6 },

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
    marginTop: 5,
  },
  googleBtn: {
    alignItems: 'center',
    borderRadius: 22,
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
  accountBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginTop: 24,
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
  goalList: {
    gap: 7,
    padding: 12,
  },
  goalOption: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 11,
    minHeight: 72,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  goalOptionIcon: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderBottomWidth: 4,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  goalOptionCopy: { lineHeight: 15, marginTop: 2 },
  goalCheck: {
    alignItems: 'center',
    borderRadius: 99,
    borderWidth: 2,
    height: 25,
    justifyContent: 'center',
    width: 25,
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
    borderWidth: 2,
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
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  rowCopy: { lineHeight: 15, marginTop: 2 },
  toggleRow: { borderBottomWidth: StyleSheet.hairlineWidth },

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
    borderWidth: 2,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
})
