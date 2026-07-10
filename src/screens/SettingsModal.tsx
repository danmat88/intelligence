import { useState } from 'react'
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Overlay from '../components/ui/Overlay'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'

/**
 * Bottom-sheet settings: profile, appearance, sign out, and the permanent
 * account deletion the Play Store requires of apps with sign-in.
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

  return (
    <>
      <Overlay open={open} onClose={onClose} align="bottom">
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 20 },
          ]}
        >
        <View style={styles.head}>
          <Txt weight="extrabold" size={20} style={{ letterSpacing: -0.3 }}>
            {t('settings.title')}
          </Txt>
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Feather name="x" size={22} color={c.textMuted} />
          </Pressable>
        </View>

        {/* profile */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius.lg }]}>
          {user.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: c.surfaceAlt }]}>
              <Feather name="user" size={22} color={c.textMuted} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Txt numberOfLines={1} weight="semibold" size={16}>
              {user.name ?? user.email}
            </Txt>
            <Txt numberOfLines={1} size={13} color={c.textFaint}>
              {user.email}
            </Txt>
          </View>
        </View>

        <Row
          icon="shield"
          label={t('settings.privacy')}
          onPress={() => Linking.openURL('https://rezolvo.web.app/privacy')}
          c={c}
        />
        <Row
          icon="file-text"
          label={t('settings.terms')}
          onPress={() => Linking.openURL('https://rezolvo.web.app/terms')}
          c={c}
        />

        {/* Language: RO ↔ EN toggle (persisted; the AI answers follow it too). */}
        <Row
          icon="globe"
          label={`${t('settings.language')} · ${t('settings.language.value')}`}
          onPress={() => setLang(lang === 'ro' ? 'en' : 'ro')}
          c={c}
        />

        <Row
          icon="log-out"
          label={t('settings.signOut')}
          onPress={() => {
            onClose()
            signOut().then(() => toast.show(t('auth.signedOut')))
          }}
          c={c}
        />

        <Pressable
          onPress={() => setConfirming(true)}
          disabled={deleting}
          style={({ pressed }) => [styles.row, { opacity: pressed || deleting ? 0.6 : 1 }]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={c.danger} />
          ) : (
            <Feather name="trash-2" size={19} color={c.danger} />
          )}
          <Txt size={16} color={c.danger}>
            {deleting ? t('settings.deleting') : t('settings.delete')}
          </Txt>
        </Pressable>
        <Txt size={12} color={c.textFaint} style={{ paddingHorizontal: 14, lineHeight: 17 }}>
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

function Row({
  icon,
  label,
  onPress,
  c,
}: {
  icon: keyof typeof Feather.glyphMap
  label: string
  onPress: () => void
  c: { text: string; textMuted: string }
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={19} color={c.textMuted} />
      <Txt size={16}>{label}</Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
})
