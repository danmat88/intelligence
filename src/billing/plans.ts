/**
 * The three Premium plans (Dan's decision 2026-07-15). RON price points are set
 * MANUALLY in Play Console (never auto-converted): clean psychological numbers
 * for the RO-first launch. Weekly is the exam-week impulse buy — deliberately
 * expensive per day so it upsells to monthly; yearly is the "obvious deal" and
 * carries the 3-day trial.
 *
 * These display strings are the PRE-BILLING placeholders. Once RevenueCat is
 * live, prices must come from the offering (Play localizes them per country) —
 * see src/billing/purchases.ts for the swap.
 */

export type PlanId = 'monthly' | 'yearly' | 'weekly'

export type Plan = {
  id: PlanId
  /** Display price, RON ("24,99 lei"). Replaced by the store's localized price once live. */
  price: string
  /** i18n key of the period label ("/ lună"). */
  periodKey: 'paywall.per.monthly' | 'paywall.per.yearly' | 'paywall.per.weekly'
  /** i18n key of the plan name. */
  nameKey: 'paywall.plan.monthly' | 'paywall.plan.yearly' | 'paywall.plan.weekly'
  /** Extra line under the price (trial, per-month equivalence). */
  noteKey?: 'paywall.trial' | 'paywall.note.yearly'
  /** True on the plan the UI pre-selects and badges as best value. */
  featured?: boolean
}

export const PLANS: Plan[] = [
  { id: 'yearly', price: '119,99 lei', periodKey: 'paywall.per.yearly', nameKey: 'paywall.plan.yearly', noteKey: 'paywall.trial', featured: true },
  { id: 'monthly', price: '24,99 lei', periodKey: 'paywall.per.monthly', nameKey: 'paywall.plan.monthly' },
  { id: 'weekly', price: '9,99 lei', periodKey: 'paywall.per.weekly', nameKey: 'paywall.plan.weekly' },
]
