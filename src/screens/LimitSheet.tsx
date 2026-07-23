import { useEffect, useRef } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import Overlay from '../components/ui/Overlay'
import IconTile from '../components/ui/IconTile'
import Press from '../components/ui/Press'
import RezIcon from '../components/ui/RezIcon'
import { SheetSignals, SignatureHandle } from '../components/ui/SheetChrome'
import Txt from '../components/ui/Txt'

/**
 * The daily-limit moment — the freemium upsell, done honestly (Dan's decision
 * 2026-07-15: NO blurred steps, ever). Two flavors, told apart by `kind`:
 * 'solve' = today's N full-quality solutions are used (guests sign in for
 * 5/day, signed-in users see Premium); 'chat' = today's questions on THIS
 * problem are used (Premium makes chat unlimited; signing in doesn't, so that
 * variant never advertises it). "Come back tomorrow" stays a first-class
 * option — the caps reset at midnight and the sheet says so, no dark patterns.
 */
export default function LimitSheet({
  open,
  kind,
  limit,
  guest,
  onClose,
  onPremium,
}: {
  open: boolean
  /** Which ceiling was hit: solves/day, or chat questions on one problem. */
  kind: 'solve' | 'chat'
  /** Today's ceiling, from the server's 429 reply (2/5 solves, 10 chat). */
  limit: number
  /** True when the limit was hit as a guest — the SOLVE upsell leads with sign-in. */
  guest: boolean
  onClose: () => void
  /** Open the Premium paywall (the solver swaps the sheets). */
  onPremium: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { user, signIn, signingIn } = useAuth()

  // Sign-in initiated FROM this sheet: linking keeps the uid and fires no
  // navigation, so the sheet itself must notice the account change and get
  // out of the way (the user comes back to the composer with 5/day active).
  const wasAnonRef = useRef(user?.isAnonymous ?? true)
  useEffect(() => {
    const isAnon = user?.isAnonymous ?? true
    if (open && guest && wasAnonRef.current && !isAnon) onClose()
    wasAnonRef.current = isAnon
  }, [user, open, guest, onClose])

  return (
    <Overlay open={open} onClose={onClose} align="bottom">
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.text, borderColor: 'rgba(255,255,255,0.10)', paddingBottom: insets.bottom + 18 },
        ]}
      >
        <SheetSignals dark />
        <SignatureHandle dark />
        <IconTile name={kind === 'chat' ? 'message' : 'solve'} size={58} iconSize={26} tone="ink" />
        <Txt style={[styles.title, { fontFamily: theme.font.display, color: '#fff' }]}>
          {t(kind === 'chat' ? 'limit.chat.title' : 'limit.title', { n: limit })}
        </Txt>
        <Txt size={13.5} color="rgba(255,255,255,0.62)" style={styles.sub}>
          {kind === 'chat' ? t('limit.chat.sub') : guest ? t('limit.sub.guest') : t('limit.sub.user')}
        </Txt>

        {kind === 'solve' && guest ? (
          <>
            {/* Guests: sign-in IS the upgrade (2/day → 5/day, work saved). */}
            <Press
              onPress={signIn}
              disabled={signingIn}
              containerStyle={styles.stretch}
              style={[styles.cta, { backgroundColor: c.accent }]}
            >
              {signingIn ? (
                <ActivityIndicator size="small" color={c.onAccent} />
              ) : (
                <>
                  <RezIcon name="user" size={17} color={c.onAccent} accent="#B8FFC9" />
                  <Txt weight="bold" size={15} color={c.onAccent}>
                    {t('limit.cta.signin')}
                  </Txt>
                </>
              )}
            </Press>
            <Press
              onPress={onPremium}
              containerStyle={styles.stretch}
              style={styles.ctaGhost}
            >
              <RezIcon name="premium" size={17} color="#A995FF" accent="#A995FF" />
              <Txt weight="semibold" size={14} color="#fff">
                {t('limit.cta.premium')}
              </Txt>
            </Press>
          </>
        ) : (
          // Signed-in: Premium is the only step up — Home's gradient moment.
          <Press onPress={onPremium} scaleTo={0.975} containerStyle={styles.stretch} style={[styles.ctaWrap, { shadowColor: c.accent }]}>
            <LinearGradient
              colors={theme.gradient.brand as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <RezIcon name="premium" size={18} color="#fff" accent="#fff" />
              <Txt weight="bold" size={15} color="#fff">
                {t('limit.cta.premium.main')}
              </Txt>
            </LinearGradient>
          </Press>
        )}

        <Txt size={11} color="rgba(255,255,255,0.42)" style={[styles.tomorrow, { fontFamily: theme.font.mono }]}>
          {t('limit.tomorrow')}
        </Txt>
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 9,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.36,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  badge: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.09)' },
  title: { fontSize: 24, letterSpacing: -0.8, textAlign: 'center', marginTop: 15 },
  sub: { textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  stretch: { alignSelf: 'stretch' },
  ctaWrap: {
    borderRadius: 18,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 52,
    borderRadius: 18,
  },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  tomorrow: { marginTop: 16, letterSpacing: 0.4, textAlign: 'center' },
})
