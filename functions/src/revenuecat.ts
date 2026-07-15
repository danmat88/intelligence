import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

/**
 * RevenueCat webhook → users/{uid}.tier. This is the ONLY writer of the
 * premium entitlement: the app reads `tier` (and the proxy's isPremium checks
 * it), RevenueCat tells us here when it changes. The app must call
 * `Purchases.logIn(firebaseUid)` so RevenueCat's app_user_id IS our uid.
 *
 * Setup (day-one checklist, docs/LAUNCH-CHECKLIST.md):
 *   1. firebase functions:secrets:set REVENUECAT_WEBHOOK_AUTH  (any long random string)
 *   2. Deploy, then in RevenueCat: Project → Integrations → Webhooks →
 *      URL = this function, Authorization header = that exact string.
 *
 * Event handling is deliberately coarse and idempotent: any event whose
 * entitlements include 'premium' grants (with premiumUntil = expiration as a
 * safety net for missed webhooks); EXPIRATION revokes. CANCELLATION only means
 * auto-renew was turned off — access legitimately continues to expiration, so
 * it does NOT revoke.
 */
const REVENUECAT_WEBHOOK_AUTH = defineSecret('REVENUECAT_WEBHOOK_AUTH')

type RCEvent = {
  type?: string
  app_user_id?: string
  entitlement_ids?: string[]
  expiration_at_ms?: number
}

export const revenuecat = onRequest(
  { region: 'europe-west1', secrets: [REVENUECAT_WEBHOOK_AUTH], maxInstances: 2, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    // RevenueCat sends the configured Authorization header verbatim.
    if (!req.headers.authorization || req.headers.authorization !== REVENUECAT_WEBHOOK_AUTH.value()) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const event = (req.body?.event ?? {}) as RCEvent
    const uid = String(event.app_user_id ?? '')
    // TEST pings and purchases made before logIn() (RevenueCat anonymous ids)
    // have no Firebase uid to write to — acknowledge and skip. Real purchases
    // can't hit this: the app logs in before showing the paywall.
    if (event.type === 'TEST' || !uid || uid.startsWith('$RCAnonymousID')) {
      res.status(200).json({ ok: true, skipped: true })
      return
    }

    const premium = Array.isArray(event.entitlement_ids) && event.entitlement_ids.includes('premium')
    const expMs = Number(event.expiration_at_ms) || 0
    try {
      if (event.type === 'EXPIRATION') {
        await getFirestore().doc(`users/${uid}`).set({ tier: 'free', premiumUntil: FieldValue.delete() }, { merge: true })
      } else if (premium) {
        await getFirestore()
          .doc(`users/${uid}`)
          .set({ tier: 'premium', ...(expMs ? { premiumUntil: Timestamp.fromMillis(expMs) } : {}) }, { merge: true })
      }
      // Events that neither grant nor expire (e.g. BILLING_ISSUE while still
      // entitled) intentionally change nothing.
      res.status(200).json({ ok: true })
    } catch (e) {
      // Non-2xx makes RevenueCat retry the webhook — exactly what we want on
      // a transient Firestore failure.
      res.status(500).json({ error: 'Failed to apply entitlement' })
    }
  },
)
