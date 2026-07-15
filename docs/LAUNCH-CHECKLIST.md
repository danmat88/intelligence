# Freemium go-live checklist

> Everything code-side is ALREADY BUILT and tested (2026-07-15): the proxy's
> daily cap, the DAILY_LIMIT client contract, LimitSheet/PaywallSheet, the
> billing stub, the RevenueCat webhook, and the Firestore rules. This file is
> the exact order of operations for the day Dan creates the accounts.
> Decisions locked (PLAN.md §4): no blurred steps, 2/day guest · 5/day Google ·
> unlimited Premium; 24,99 lei/lună · 119,99 lei/an (3-day trial) · 9,99 lei/săpt.

## What's already DONE (deployed 2026-07-15)

- **Daily cap is LIVE** on the `gemini` proxy (2/5/∞, counted per PROBLEM,
  reset at midnight Europe/Bucharest). Verified end-to-end with curl against
  production: guest solve #3 → 429 DAILY_LIMIT, retry of a charged problem →
  free, followup → unmetered. Old builds without the purpose header are NOT
  metered (grandfathered); every build from this code on is.
- **`revenuecat` webhook is DEPLOYED**:
  `https://europe-west1-gen-lang-client-0286445774.cloudfunctions.net/revenuecat`
  — it just waits for RevenueCat to be pointed at it (step 3/4 below).
- **Secret `REVENUECAT_WEBHOOK_AUTH` exists** in Secret Manager (random value).
  Read it when configuring RevenueCat's webhook with:
  `firebase functions:secrets:access REVENUECAT_WEBHOOK_AUTH`
- **Firestore rules released** — `users/{uid}` owner-readable (tier), never
  client-writable.
- `src/billing/purchases.ts` — the ONE file that flips billing live
  (`BILLING_READY=false` stub today; swap steps are in its header comment).
- `src/screens/LimitSheet.tsx` / `PaywallSheet.tsx` — cap-hit upsell + paywall,
  fully wired into SolverScreen; CTA shows an honest "coming soon" toast until
  the stub is swapped.
- **Dev comfort:** to keep your own account uncapped while developing, set
  `tier: "premium"` (string) on your `users/{uid}` doc in the Firebase console
  (Firestore → users → your uid; find the uid in Authentication). Remove the
  field to test the free flow again.

## 1 · Google Play Console (Dan, ~1h + identity-check wait)

1. https://play.google.com/console → create developer account (25 $ one-time).
   Identity verification can take DAYS — start this first.
2. Set up the **payments/merchant profile** (bank + fiscal data) — required
   before any subscription product can exist.
3. Create the app: package `com.rezolvo.app`, category Education.

## 2 · Subscription products (Play Console → Monetize → Subscriptions)

One subscription, three base plans (ids are contracts — use exactly these):

| Base plan id | Period | Price (set MANUALLY for RO) |
|--------------|--------|------------------------------|
| `monthly`    | P1M    | **24,99 RON** |
| `yearly`     | P1Y    | **119,99 RON** + offer: 3-day free trial |
| `weekly`     | P1W    | **9,99 RON** |

- Subscription id: `premium`.
- Never accept auto-converted prices — set the RON values by hand (clean
  psychological numbers). Other countries can stay auto until we expand.
- App availability at launch: **Romania + Moldova** only.

## 3 · RevenueCat (~30 min + up to 36h credential propagation)

1. Create the project; add an **Android (Play Store)** app for `com.rezolvo.app`.
2. Play service credentials: follow RevenueCat's guide (Google Cloud service
   account → grant it Play Console API access). **Gotcha: permissions can take
   up to 36h to propagate** — do this early, test purchases the next day.
3. Entitlement id: **`premium`** — EXACTLY this string; the webhook
   (`functions/src/revenuecat.ts`) and the proxy's `isPremium` both key on it.
4. Attach all three products to the `premium` entitlement.
5. Offering `default` with the three packages (annual / monthly / weekly).
6. Copy the **public Android SDK key** (goes in the app env, step 5).

## 4 · Backend switches (me, ~5 min — deploy already done 2026-07-15)

- 4a. Firestore console → TTL policy on collection `daily_solves`, field
  `expiresAt` (same pattern as the existing `rate_limits` policy).
- 4b. RevenueCat → Integrations → Webhooks: URL =
  `https://europe-west1-gen-lang-client-0286445774.cloudfunctions.net/revenuecat`,
  Authorization header = output of
  `firebase functions:secrets:access REVENUECAT_WEBHOOK_AUTH`.
- 4c. Send RevenueCat's TEST event — expect 200 `{ok:true, skipped:true}`.

## 5 · App switches (me, ~1h + a rebuild)

1. `npx expo install react-native-purchases` (autolinks — NO prebuild; if one
   ever runs, re-apply the two gradle pins from CLAUDE.md).
2. Env: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` → local `.env` + `eas env` for
   preview/production.
3. Swap `src/billing/purchases.ts` stub → real SDK calls (the exact mapping is
   written in that file's header), flip `BILLING_READY = true`.
4. Wire `configurePurchases(user.id)` in `AuthProvider` once auth resolves —
   and again after guest→Google linking (`Purchases.logIn` is what ties the
   webhook's `app_user_id` to our Firebase uid; without it entitlements strand
   on an anonymous RevenueCat id).
5. Paywall prices: switch `PLANS` display strings to the offering's localized
   `priceString` (Play then shows every country its own currency).
6. Rebuild + install; the proxy is already deployed (step 4), so new-build
   solves start counting 2/5/∞ immediately.

## 6 · Verify end-to-end (device, adb evidence per house rules)

- [ ] Guest: 2 solves fine, 3rd → LimitSheet ("Ai folosit cele 2 rezolvări de
      azi") with Google CTA. Screenshot.
- [ ] Sign in from the sheet → sheet closes itself, solves continue (3/5).
- [ ] Logged-in: cap at 5 → LimitSheet with Premium CTA → PaywallSheet.
- [ ] License-tester purchase (Play Console → Setup → License testing) on the
      internal track → webhook fires → `users/{uid}.tier == 'premium'` in
      Firestore → solves uncapped → PaywallSheet shows "Ești Premium".
- [ ] Retry/escalation of ONE problem consumes ONE slot (watch `daily_solves`
      doc: `problems` array grows by one id per problem, not per request).
- [ ] Follow-up questions and the verifier consume ZERO slots.
- [ ] Next day (or delete the `daily_solves/{uid}` doc): counter reset.

## Cross-checks that guard the money

- Proxy deploy order stays ADDITIVE (CLAUDE.md rule): deploy functions before
  shipping an APK that depends on them — true here (old builds unmetered).
- **Guest cap is INSTALL-keyed** (`X-Rezolvo-Device` → `daily_solves/device_*`):
  sign-out mints a fresh anonymous uid, so uid-keying would be an infinite
  "log out, get 2 more" loop. Proven on prod 2026-07-15: fresh uid + same
  install → still 429.
- **Chat is capped 10/problem/day** for free users (CHAT_LIMIT contract), and
  the followup prompt refuses brand-new problems — the "solve new problems in
  chat" side door is closed on both layers. Proven on prod: 10×200 → 429
  CHAT_LIMIT, other problems unaffected.
- **Prompt changes are gated by `npm run eval:prompts`** (real-model, 20 fixed
  cases: real problems must solve, commands/chit-chat/gibberish must return
  {"error"}). Run it on EVERY prompt edit; it must stay 20/20.
- A hacked client can spoof `X-Rezolvo-Purpose`/`X-Rezolvo-Device` → the
  per-minute rate limit still bounds burn; the REAL fix is App Check (Play
  Integrity), already on the roadmap Phase 4 — do it before any marketing push.
- `users/{uid}.tier` is written ONLY by the webhook/Admin SDK; rules tests
  lock this in (`npm run test:rules`, 16 tests).
