import type { PlanId } from './plans'

/**
 * Billing abstraction. TODAY this is a stub — accounts (Play Console merchant,
 * RevenueCat) don't exist yet, so `BILLING_READY` is false and the paywall's
 * CTA shows the honest "coming soon" toast. The UI, the limit flow and the
 * server entitlement are all live; flipping billing on is JUST this file.
 *
 * Day-one swap (full steps in docs/LAUNCH-CHECKLIST.md):
 *   1. `npx expo install react-native-purchases` (autolinks; rebuild the app —
 *      if a prebuild sneaks in, re-apply the two gradle pins from CLAUDE.md).
 *   2. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY (EAS env + local .env).
 *   3. Replace the bodies below with:
 *        import Purchases from 'react-native-purchases'
 *        configure → Purchases.configure({ apiKey }) + Purchases.logIn(uid)
 *          (logIn(uid) is what makes the webhook's app_user_id our Firebase
 *           uid — without it entitlements land on an anonymous RC id and the
 *           server never learns about the purchase)
 *        purchase  → find the offering package for the plan id and call
 *          Purchases.purchasePackage(pkg); user-cancelled is NOT an error.
 *        restore   → Purchases.restorePurchases()
 *      The entitlement itself still arrives via the RevenueCat webhook →
 *      users/{uid}.tier (see functions/src/revenuecat.ts) — the app reads it
 *      with subscribeTier(); no client-side entitlement writes, ever.
 *   4. Switch the paywall's displayed prices from PLANS to the offering's
 *      localized priceString (Play shows each country its own currency).
 */

export const BILLING_READY = false

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'cancelled' | 'error'; message?: string }

/** Connect the store SDK to this user. Call after auth resolves (and again
 *  after guest→Google linking, so entitlements follow the account). No-op
 *  until RevenueCat is configured. */
export async function configurePurchases(_uid: string): Promise<void> {
  // stub: nothing to configure yet
}

/** Buy a plan. Stub: always 'unconfigured' — the paywall explains gently. */
export async function purchase(_plan: PlanId): Promise<PurchaseResult> {
  return { ok: false, reason: 'unconfigured' }
}

/** Restore previous purchases (Play account moved to a new device). */
export async function restore(): Promise<PurchaseResult> {
  return { ok: false, reason: 'unconfigured' }
}
