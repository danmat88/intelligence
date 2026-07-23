import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useI18n, type StringKey } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import Overlay from '../components/ui/Overlay'
import IconTile, { SelectionMark } from '../components/ui/IconTile'
import Press from '../components/ui/Press'
import RezIcon, { type RezIconName } from '../components/ui/RezIcon'
import { SheetHeader, SheetSignals, SignatureHandle } from '../components/ui/SheetChrome'
import Txt from '../components/ui/Txt'
import { useToast } from '../components/ui/Toast'
import { PLANS, type PlanId } from '../billing/plans'
import { purchase, restore } from '../billing/purchases'
import { subscribeTier, type Tier } from '../billing/tier'
import { track } from '../lib/analytics'

/**
 * Rezolvo Premium — the paywall. Sells QUANTITY, not withheld quality (the
 * no-blur contract): unlimited solves, unlimited follow-up questions, new
 * features first. Three RON plans (yearly featured, 3-day trial; weekly is the
 * exam-week impulse buy). Until RevenueCat is configured the CTA answers with
 * an honest "payments turn on soon" toast (src/billing/purchases.ts is the
 * one file that flips this live). Entitlement state streams from
 * users/{uid}.tier, so a completed purchase flips this sheet to the
 * "you're Premium" state without any client-side entitlement logic.
 */
export default function PaywallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const toast = useToast()
  const { user } = useAuth()
  const [selected, setSelected] = useState<PlanId>(PLANS.find((p) => p.featured)?.id ?? 'yearly')
  const [tier, setTier] = useState<Tier>('free')

  useEffect(() => {
    if (!open || !user) return
    track('paywall_view')
    return subscribeTier(user.id, setTier)
  }, [open, user])

  const buy = async (action: () => ReturnType<typeof purchase>) => {
    const r = await action()
    if (r.ok) {
      onClose() // the tier snapshot flips the UI; nothing else to do here
    } else if (r.reason === 'unconfigured') {
      toast.show(t('paywall.soon'), 'clock')
    } else if (r.reason === 'error') {
      toast.show(t('err.generic'), 'alert-triangle')
    }
    // 'cancelled' is the user's own choice — no toast, no drama
  }

  const benefits: { icon: RezIconName; key: StringKey }[] = [
    { icon: 'premium', key: 'paywall.benefit.unlimited' },
    { icon: 'message', key: 'paywall.benefit.chat' },
    { icon: 'search', key: 'paywall.benefit.mistake' },
  ]

  return (
    <Overlay open={open} onClose={onClose} align="bottom">
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.bgElevated, borderColor: c.border, paddingBottom: insets.bottom + 14 },
        ]}
      >
        <SheetSignals />
        <SignatureHandle />
        <SheetHeader
          icon="premium"
          onClose={onClose}
          closeLabel={t('a11y.close')}
          title={<Txt style={[styles.title, { fontFamily: theme.font.display, color: c.text }]}>
            Rezolvo{' '}
            <Txt style={{ fontFamily: theme.font.display, fontSize: 22, color: c.accent }}>Premium</Txt>
          </Txt>}
        />

        {tier === 'premium' ? (
          // Already entitled (fresh purchase or restored): celebrate, don't sell.
          <View style={styles.already}>
            <View style={[styles.alreadyBadge, { backgroundColor: c.successSoft }]}>
              <RezIcon name="check" size={26} color={c.success} accent={c.success} />
            </View>
            <Txt size={14.5} color={c.textMuted} style={styles.alreadyTxt}>
              {t('paywall.already')}
            </Txt>
          </View>
        ) : (
          <>
            <View style={styles.benefits}>
              {benefits.map((b) => (
                <View key={b.key} style={styles.benefit}>
                  <IconTile name={b.icon} size={30} iconSize={15} tone="ink" />
                  <Txt size={13} color="rgba(255,255,255,0.78)" style={styles.benefitTxt}>
                    {t(b.key)}
                  </Txt>
                </View>
              ))}
            </View>

            {PLANS.map((p) => {
              const active = selected === p.id
              return (
                <Press
                  key={p.id}
                  onPress={() => {
                    if (!active) Haptics.selectionAsync().catch(() => {})
                    setSelected(p.id)
                  }}
                  containerStyle={styles.stretch}
                  style={[
                    styles.plan,
                    {
                      backgroundColor: active ? c.accentSoft : c.surface,
                      borderColor: active ? c.accent : c.border,
                    },
                  ]}
                >
                  <View style={styles.flex}>
                    <View style={styles.planNameRow}>
                      <Txt weight="semibold" size={14.5} color={c.text}>
                        {t(p.nameKey)}
                      </Txt>
                      {p.featured && (
                        <Txt size={9.5} weight="bold" color={c.accent} style={[styles.planBadge, { backgroundColor: c.bgElevated, fontFamily: theme.font.mono }]}>
                          {t('paywall.badge.best')}
                        </Txt>
                      )}
                    </View>
                    {p.noteKey && (
                      <Txt size={11.5} color={p.featured ? c.success : c.textFaint} weight={p.featured ? 'semibold' : 'regular'} style={styles.planNote}>
                        {t(p.noteKey)}
                      </Txt>
                    )}
                  </View>
                  <Txt weight="bold" size={15} color={c.text}>
                    {p.price}
                    <Txt size={11.5} color={c.textFaint}>
                      {' '}
                      {t(p.periodKey)}
                    </Txt>
                  </Txt>
                  <SelectionMark active={active} />
                </Press>
              )
            })}

            <Press
              onPress={() => {
                track('purchase_attempt', { plan: selected })
                buy(() => purchase(selected))
              }}
              scaleTo={0.975}
              containerStyle={styles.stretch}
              style={[styles.ctaWrap, { shadowColor: c.accent }]}
            >
              <LinearGradient
                colors={theme.gradient.brand as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <RezIcon name="premium" size={18} color="#fff" accent="#fff" />
                <Txt weight="bold" size={15} color="#fff">
                  {t('paywall.cta')}
                </Txt>
              </LinearGradient>
            </Press>

            <View style={styles.legalRow}>
              <Txt size={10.5} color={c.textFaint}>
                {t('paywall.legal')}
              </Txt>
              <Press onPress={() => buy(restore)} hitSlop={8}>
                <Txt size={10.5} weight="semibold" color={c.accent}>
                  {t('paywall.restore')}
                </Txt>
              </Press>
            </View>
          </>
        )}
      </View>
    </Overlay>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 9,
    shadowColor: '#15121F',
    shadowOpacity: 0.24,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  title: { fontSize: 24, letterSpacing: -0.9 },
  benefits: { backgroundColor: '#15121F', borderRadius: 20, gap: 3, marginBottom: 13, paddingHorizontal: 10, paddingVertical: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 36 },
  benefitTxt: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 999, overflow: 'hidden', letterSpacing: 0.6 },
  planNote: { marginTop: 3 },
  ctaWrap: {
    marginTop: 6,
    borderRadius: 17,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  cta: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', height: 50, borderRadius: 17 },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 },
  already: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 24 },
  alreadyBadge: { width: 56, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  alreadyTxt: { marginTop: 12, textAlign: 'center' },
})
