import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../auth/AuthProvider'
import BrandLockup from '../components/ui/BrandLockup'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'
import { useAppLifecycle } from '../navigation/AppLifecycleProvider'
import { useProduct } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'

/** A profile lookup is a real lifecycle state, not an unfinished profile. This
 * screen prevents cache misses and offline starts from masquerading as first
 * launch onboarding. */
export default function ProfileGateScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()
  const { online } = useAppLifecycle()
  const { user, signOut, deleteAccount } = useAuth()
  const { profileStatus, retryProfile } = useProduct()
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState(false)
  const [confirmingGuestExit, setConfirmingGuestExit] = useState(false)
  const unavailable = profileStatus === 'error' || !online
  const c = theme.colors

  const leaveSession = async () => {
    if (!user || leaving) return
    setLeaving(true)
    setLeaveError(false)
    try {
      if (user.isAnonymous) await deleteAccount()
      else await signOut()
    } catch {
      setLeaveError(true)
      setLeaving(false)
    }
  }

  return (
    <ScreenBackground>
      <View style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <BrandLockup />

        <View style={styles.center}>
          <View style={[styles.badge, { backgroundColor: unavailable ? c.sunnySoft : c.accentSoft, borderColor: unavailable ? c.bubblyYellowDark : c.bubblyRedDark }]}>
            {unavailable ? (
              <RezIcon name="alert" size={30} color={c.text} accent={c.bubblyRed} />
            ) : (
              <ActivityIndicator size="large" color={c.bubblyRed} />
            )}
          </View>

          <Txt style={[styles.title, { color: c.text, fontFamily: theme.font.display }]}>
            {unavailable ? 'Nu putem încărca profilul' : 'Pregătim spațiul tău'}
          </Txt>
          <Txt size={14.5} color={c.textMuted} style={styles.copy}>
            {unavailable
              ? online
                ? 'Datele tale nu au fost modificate. Încearcă din nou pentru a continua în siguranță.'
                : 'Conectează-te la internet ca să verificăm profilul pe acest dispozitiv.'
              : 'Verificăm contul și preferințele tale. Durează doar un moment.'}
          </Txt>

          {leaveError && (
            <Txt size={13} color={c.danger} style={styles.error}>
              Nu am putut închide sesiunea. Verifică internetul și încearcă din nou.
            </Txt>
          )}

          <View style={styles.actions}>
            {unavailable && (
              <Press
                onPress={retryProfile}
                disabled={!online || leaving}
                pressDepth={4}
                style={[
                  styles.primary,
                  {
                    backgroundColor: online ? c.bubblyGreen : c.surfaceAlt,
                    borderColor: online ? c.bubblyGreenDark : c.cardEdge,
                    borderBottomColor: online ? c.bubblyGreenDark : c.cardEdge,
                  },
                ]}
              >
                <RezIcon name="retry" size={19} color={online ? '#FFFFFF' : c.textFaint} />
                <Txt weight="bold" size={15} color={online ? '#FFFFFF' : c.textFaint}>Încearcă din nou</Txt>
              </Press>
            )}

            <Press
              onPress={() => user?.isAnonymous
                ? setConfirmingGuestExit(true)
                : void leaveSession()}
              disabled={leaving}
              pressDepth={2}
              style={styles.secondary}
            >
              {leaving ? (
                <ActivityIndicator size="small" color={c.textMuted} />
              ) : (
                <>
                  <RezIcon name="logout" size={17} color={c.textMuted} />
                  <Txt weight="bold" size={13.5} color={c.textMuted}>
                    {user?.isAnonymous ? 'Renunță la sesiune' : 'Folosește alt cont'}
                  </Txt>
                </>
              )}
            </Press>
          </View>
        </View>
      </View>
      <ConfirmDialog
        open={confirmingGuestExit}
        title="Ștergi sesiunea?"
        message="Șterge definitiv sesiunea anonimă și toate datele asociate. Nu există anulare."
        confirmLabel="Șterge"
        cancelLabel="Anulează"
        onConfirm={() => void leaveSession()}
        onClose={() => setConfirmingGuestExit(false)}
      />
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 52 },
  badge: { alignItems: 'center', borderBottomWidth: 7, borderRadius: 26, borderWidth: 3, height: 84, justifyContent: 'center', width: 84 },
  title: { fontSize: 30, letterSpacing: -1, lineHeight: 36, marginTop: 24, textAlign: 'center' },
  copy: { lineHeight: 21, marginTop: 8, maxWidth: 390, textAlign: 'center' },
  error: { lineHeight: 18, marginTop: 14, maxWidth: 380, textAlign: 'center' },
  actions: { gap: 10, marginTop: 28, maxWidth: 390, width: '100%' },
  primary: { alignItems: 'center', borderBottomWidth: 7, borderRadius: 22, borderWidth: 3, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 60 },
  secondary: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46 },
})
