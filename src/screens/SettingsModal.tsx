import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Image, Linking, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Overlay from '../components/ui/Overlay'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'

/**
 * Bottom-sheet settings with real structure: profile panel up top, then
 * labelled groups (Preferences / Legal / Account) of icon-tile rows with
 * hairline separators, and the destructive action visually quarantined at the
 * bottom. Includes the permanent account deletion the Play Store requires.
 */
export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { user, signIn, signingIn, signOut, deleteAccount } = useAuth()
  const { t, lang, setLang } = useI18n()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!user) return null
  const isGuest = user.isAnonymous

  const doDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      // Deletion signs the user out; the provider silently drops them into a
      // FRESH guest session (no dead-end gate). Close the sheet and confirm.
      onClose()
      toast.show(t('settings.deleted'), 'check')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : t('settings.deleteError'), 'alert-triangle')
    } finally {
      setDeleting(false)
    }
  }

  const mono = { fontFamily: theme.font.mono }

  return (
    <>
      <Overlay open={open} onClose={onClose} align="bottom">
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={[styles.grab, { backgroundColor: c.border }]} />
          <View style={styles.head}>
            <Txt style={{ fontFamily: theme.font.display, fontSize: 22, letterSpacing: -0.4, color: c.text }}>
              {t('settings.title')}
            </Txt>
            <Press onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11y.close')} scaleTo={0.88} style={[styles.closeBtn, { backgroundColor: c.surfaceAlt }]}>
              <RezIcon name="close" size={17} color={c.textMuted} accent={c.accent} />
            </Press>
          </View>

          {/* profile panel — for a guest this is the sign-in pitch instead */}
          {isGuest ? (
            <Press
              onPress={() => {
                onClose()
                signIn()
              }}
              disabled={signingIn}
              scaleTo={0.98}
              style={styles.stretch}
            >
              <LinearGradient
                colors={theme.gradient.brand as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.guestCard}
              >
                <View style={styles.guestIcon}>
                  {signingIn ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <RezIcon name="login" size={20} color="#fff" accent="#B8FFC9" />
                  )}
                </View>
                <View style={styles.flex}>
                  <Txt weight="bold" size={15.5} color="#fff">
                    {t('settings.guest.title')}
                  </Txt>
                  <Txt size={12.5} color="rgba(255,255,255,0.82)" style={styles.guestSub}>
                    {t('settings.guest.sub')}
                  </Txt>
                </View>
                <RezIcon name="arrow" size={18} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            </Press>
          ) : (
            <View style={[styles.profile, { backgroundColor: c.surface, borderColor: c.border }]}>
              {user.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.accentSoft }]}>
                  <RezIcon name="user" size={22} color={c.accent} accent={c.accent} />
                </View>
              )}
              <View style={styles.flex}>
                <Txt numberOfLines={1} weight="semibold" size={16}>
                  {user.name ?? user.email}
                </Txt>
                <Txt numberOfLines={1} size={13} color={c.textFaint}>
                  {user.email}
                </Txt>
              </View>
            </View>
          )}

          <SectionLabel text={t('settings.section.prefs')} color={c.textFaint} monoStyle={mono} />
          <Group border={c.border} surface={c.surface}>
            <Row
              icon="language"
              label={t('settings.language')}
              value={t('settings.language.value')}
              onPress={() => setLang(lang === 'ro' ? 'en' : 'ro')}
              c={c}
            />
          </Group>

          <SectionLabel text={t('settings.section.legal')} color={c.textFaint} monoStyle={mono} />
          <Group border={c.border} surface={c.surface}>
            <Row icon="shield" label={t('settings.privacy')} onPress={() => Linking.openURL('https://rezolvo.web.app/privacy')} c={c} />
            <Separator color={c.border} />
            <Row icon="document" label={t('settings.terms')} onPress={() => Linking.openURL('https://rezolvo.web.app/terms')} c={c} />
          </Group>

          {/* Account actions only make sense for a real (signed-in) account:
              a guest has no Google identity to sign out of or reauth-delete. */}
          {!isGuest && (
            <>
              <SectionLabel text={t('settings.section.account')} color={c.textFaint} monoStyle={mono} />
              <Group border={c.border} surface={c.surface}>
                <Row
                  icon="logout"
                  label={t('settings.signOut')}
                  onPress={() => {
                    onClose()
                    signOut().then(() => toast.show(t('auth.signedOut')))
                  }}
                  c={c}
                />
                <Separator color={c.border} />
                <Press onPress={() => setConfirming(true)} disabled={deleting} scaleTo={0.98} style={[styles.row, deleting && styles.dim]}>
                  <View style={[styles.rowIcon, { backgroundColor: c.dangerSoft }]}>
                    {deleting ? (
                      <ActivityIndicator size="small" color={c.danger} />
                    ) : (
                      <RezIcon name="trash" size={16} color={c.danger} accent={c.danger} />
                    )}
                  </View>
                  <Txt size={15} weight="medium" color={c.danger} style={styles.flex}>
                    {deleting ? t('settings.deleting') : t('settings.delete')}
                  </Txt>
                </Press>
              </Group>
              <Txt size={11.5} color={c.textFaint} style={styles.note}>
                {t('settings.deleteNote')}
              </Txt>
            </>
          )}
        </View>
      </Overlay>

      {/* sibling of the sheet's overlay so it stacks fullscreen above it */}
      <ConfirmDialog
        open={confirming}
        title={t('settings.confirm.title')}
        message={t('settings.confirm.message')}
        confirmLabel={t('settings.confirm.cta')}
        cancelLabel={t('settings.confirm.cancel')}
        onConfirm={doDelete}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

function SectionLabel({ text, color, monoStyle }: { text: string; color: string; monoStyle: { fontFamily: string } }) {
  return (
    <Txt size={10.5} color={color} style={[styles.sectionLabel, monoStyle]}>
      {text.toUpperCase()}
    </Txt>
  )
}

/** A grouped card of rows — the sections read as one designed object. */
function Group({ children, border, surface }: { children: ReactNode; border: string; surface: string }) {
  return <View style={[styles.group, { borderColor: border, backgroundColor: surface }]}>{children}</View>
}

function Separator({ color }: { color: string }) {
  return <View style={[styles.sep, { backgroundColor: color }]} />
}

function Row({
  icon,
  label,
  value,
  onPress,
  c,
}: {
  icon: RezIconName
  label: string
  value?: string
  onPress: () => void
  c: { text: string; textMuted: string; textFaint: string; surfaceAlt: string; accent: string }
}) {
  return (
    <Press onPress={onPress} scaleTo={0.98} style={styles.row}>
      <View style={styles.rowIcon}>
        <RezIcon name={icon} size={18} color={c.textMuted} accent={c.accent} />
      </View>
      <Txt size={15} weight="medium" style={styles.flex}>
        {label}
      </Txt>
      {!!value && (
        <Txt size={13.5} color={c.textFaint}>
          {value}
        </Txt>
      )}
      <RezIcon name="chevron" size={16} color={c.textFaint} accent={c.accent} />
    </Press>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 17,
    paddingTop: 9,
    shadowColor: '#15121F',
    shadowOpacity: 0.22,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  grab: { alignSelf: 'center', width: 30, height: 3, borderRadius: 2, marginBottom: 11 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 6,
  },
  stretch: { alignSelf: 'stretch' },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginBottom: 6,
  },
  guestIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  guestSub: { marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { letterSpacing: 1.15, marginTop: 13, marginBottom: 6, paddingHorizontal: 3 },
  group: { borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 49 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 11, paddingVertical: 8 },
  rowIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center' },
  note: { paddingHorizontal: 6, paddingTop: 8, lineHeight: 16 },
  flex: { flex: 1 },
  dim: { opacity: 0.6 },
})
