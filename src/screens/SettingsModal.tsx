import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Image, Linking, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Overlay from '../components/ui/Overlay'
import Press from '../components/ui/Press'
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
  const { user, signOut, deleteAccount } = useAuth()
  const { t, lang, setLang } = useI18n()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!user) return null

  const doDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount() // success -> auth gate returns to Welcome
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
              <Feather name="x" size={17} color={c.textMuted} />
            </Press>
          </View>

          {/* profile panel */}
          <View style={[styles.profile, { backgroundColor: c.surface, borderColor: c.border }]}>
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.accentSoft }]}>
                <Feather name="user" size={22} color={c.accent} />
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

          <SectionLabel text={t('settings.section.prefs')} color={c.textFaint} monoStyle={mono} />
          <Group border={c.border} surface={c.surface}>
            <Row
              icon="globe"
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
            <Row icon="file-text" label={t('settings.terms')} onPress={() => Linking.openURL('https://rezolvo.web.app/terms')} c={c} />
          </Group>

          <SectionLabel text={t('settings.section.account')} color={c.textFaint} monoStyle={mono} />
          <Group border={c.border} surface={c.surface}>
            <Row
              icon="log-out"
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
                  <Feather name="trash-2" size={16} color={c.danger} />
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
  icon: keyof typeof Feather.glyphMap
  label: string
  value?: string
  onPress: () => void
  c: { text: string; textMuted: string; textFaint: string; surfaceAlt: string }
}) {
  return (
    <Press onPress={onPress} scaleTo={0.98} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: c.surfaceAlt }]}>
        <Feather name={icon} size={16} color={c.textMuted} />
      </View>
      <Txt size={15} weight="medium" style={styles.flex}>
        {label}
      </Txt>
      {!!value && (
        <Txt size={13.5} color={c.textFaint}>
          {value}
        </Txt>
      )}
      <Feather name="chevron-right" size={17} color={c.textFaint} />
    </Press>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 14 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 6,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { letterSpacing: 1.1, marginTop: 14, marginBottom: 7, paddingHorizontal: 6 },
  group: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  note: { paddingHorizontal: 6, paddingTop: 8, lineHeight: 16 },
  flex: { flex: 1 },
  dim: { opacity: 0.6 },
})
