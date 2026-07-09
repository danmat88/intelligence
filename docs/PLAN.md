# Math Solver App — Full Build Plan

> A camera-first AI math tutor. Free users get an impressive taste; premium unlocks
> step-by-step solutions, "find my mistake", and unlimited use. Consumer freemium,
> no ads. Built on the existing Expo + Firebase + Gemini stack.

---

## 1. The one-line promise
**Point your phone at any math problem — printed or handwritten — and get the correct
answer, worked out step by step, at any level.**

## 2. The core principle (this is what makes it trustworthy)
The AI is **never the calculator.** Work is split by strength:
- **Gemini VISION** reads the problem from the photo (its strength).
- **CODE EXECUTION** does the exact computation (deterministic, correct).
- **Gemini LANGUAGE** explains the steps and tutors (its strength).
- **A VERIFY step** plugs the answer back in to confirm before we show it.

We lean on the model only where it is strong, and delegate exactness to real code.

---

## 3. AI model strategy (route by task AND by tier)

We do NOT use one model everywhere. Wrong model = either bad quality or bankruptcy.

| Task | Model | Why |
|------|-------|-----|
| Read the photo (OCR/handwriting) | Gemini **Flash** | Cheap, fast, good enough to read text |
| Solve (reasoning + code execution) | Gemini **Pro**, thinking ON | Correctness matters most here |
| Explain / follow-up chat / Socratic | Gemini **Flash** | Cheaper, quality is fine for prose |
| Generate practice / tag topics | Gemini **Flash-Lite** | High volume, low stakes |

The proxy already whitelists models (`ALLOWED_MODELS`) — infra is ready.

### Free vs premium — the model question, answered
**Everyone gets the good model. The difference is QUANTITY + DEPTH, not quality.**
- **Free:** best model, but **capped (e.g. 3–5 problems/day)** and **shallow**
  (final answer + one-line "how", no full steps, no find-my-mistake, no unlimited chat).
- **Premium:** unlimited, full step-by-step, find-my-mistake, Socratic mode, practice.

Reasoning: free is the marketing (the "wow" people film for TikTok). If free is wrong or
weak, virality dies. Free must impress; premium must be indispensable.

### Cost control (non-negotiable — this is how the app survives going viral)
Every free solve costs real API money. Viral growth + no caps = you owe thousands with
zero revenue. So:
- Hard per-user daily cap on free tier (reuse the existing rate-limit machinery).
- Cheap model for reading/explaining; expensive model only for the solve.
- Cache identical problems (a photo of a common textbook problem → reuse the solution).
- Server-side clamp on tokens (already in the proxy).

---

## 4. Free vs Premium (the paywall)

| Feature | Free | Premium |
|---------|------|---------|
| Snap & solve (final answer) | ✅ 3–5/day | ✅ unlimited |
| Full step-by-step working | ❌ (blurred, paywalled) | ✅ |
| "Find my mistake" (photo of your work) | ❌ | ✅ |
| Socratic mode (it asks you) | ❌ | ✅ |
| Follow-up questions / chat | 1–2 per problem | ✅ unlimited |
| Practice problems + skill tracking | ❌ | ✅ |
| History / library | last 5 | ✅ full |

Paywall trigger: after the free answer, show the steps **blurred** with "Unlock steps".
That is the moment of maximum want (they have the answer, they need the *how*).

Pricing (starting point, tune later): **weekly ~€4.99 / monthly ~€7.99 / yearly ~€39.99**,
3-day free trial on yearly. Weekly exists because students buy for one exam week.

---

## 5. Screens & flows

Bottom tabs: **Solve · Practice · You** (Solve is the landing screen).

**Solve (hero):**
1. Big camera button → take/pick photo (or type).
2. **Confirm-what-I-read** step: show the parsed problem typeset; user can edit. (Critical —
   an OCR misread poisons everything.)
3. Solve → stream the worked solution with real typeset math.
4. Result actions: "I don't get this step", "similar problem", "find my mistake" (premium).

**Practice:** generated problems at the user's level, on weak topics. (premium)

**You:** skill map (strong/weak topics), streak, history/library. (mostly premium)

## 6. The correctness engine (the real work — where value lives)
1. Vision reads the problem → structured statement.
2. Confirm step (user can correct).
3. Solve model runs **code execution** to compute exactly + produce steps.
4. **Verify:** substitute the result back / re-check by code. If it fails, retry or flag
   "let me double-check this" rather than showing a wrong answer.
5. Render steps as typeset math (KaTeX in a WebView; handle streaming partial LaTeX).

Honest note: this is the genuine engineering. Reading + UI is half-built already; the
solve/verify engine is the serious part and where the effort goes.

## 7. Data model (Firestore)
- `users/{uid}` — profile, tier, daily-usage counter, streak.
- `users/{uid}/problems/{id}` — image ref, parsed statement, steps, topic tags, status.
- `users/{uid}/skills/{topic}` — mastery score, last-seen (for spaced repetition).
- `rate_limits/{uid}` — already exists; extend for the free daily cap.
- Images: Firebase Storage (NOT set up yet) — or don't store the raw photo at all (cheaper,
  privacy-friendly) and keep only the parsed statement. **Recommend: don't store photos.**

## 8. Payments
- **Google Play Billing** for subscriptions (required — you can't use Stripe for digital
  goods in a Play app). Google takes 15% (first $1M/yr) then 30%.
- Use **RevenueCat** to wrap billing — handles receipts, trials, restore, entitlements,
  cross-platform. Free under ~$2.5k/mo revenue. Saves weeks of billing pain.
- Entitlement check gates premium features client-side; verify server-side before premium
  API calls so a hacked client can't get free Pro usage.

## 9. Legal & safety (you are charging money and serving minors)
- **Privacy policy + Terms** (required by Play Store, and you take payments). Generate,
  host a page. Must cover: data collected, AI processing, subscriptions, cancellation.
- **Subscription disclosure** exactly per Play rules (price, renewal, how to cancel) or you
  get rejected.
- **Minors:** students are under 18. Play "Teacher Approved"/families policy, no creepy data
  collection, clear COPPA/GDPR-K posture. Keep data minimal.
- **Accuracy disclaimer:** "for learning support; verify important answers." Reduces liability
  when (not if) it occasionally errs.
- **Content safety:** it's math — low risk, but block off-topic misuse of the vision model.

## 10. Cost & pricing math (sanity check)
- Assume a solve costs ~€0.01–0.05 in API (vision + Pro reasoning + code).
- Free user at 5/day capped = worst case ~€0.05–0.25/day. Multiply by free users → this is
  your burn. Caps + caching keep it survivable.
- One yearly subscriber (~€40, minus 15% = ~€34) covers a LOT of free-user solves.
- Target: keep free-tier API burn below what a healthy % of converters bring in. Watch it
  weekly at launch; tighten caps if burn outruns revenue.

## 11. Distribution (the real fight — harder than building)
- **Short video (TikTok/Reels/Shorts)** is the growth engine, not ads. The app must have a
  10-second filmable "wow": point → magic answer.
- **ASO:** keywords like "math solver", "homework help", "step by step". Screenshots that
  sell the steps.
- Seed in student communities (Reddit, Discord, TikTok study-tok).
- Launch timing: align with exam seasons.

## 12. Edge cases & failure states (design each, don't crash)
- Unreadable / blurry photo → "couldn't read it, retype or retake".
- Non-math photo → polite "that doesn't look like a math problem".
- Multiple problems in one photo → let user crop/pick one.
- Model unsure / verify fails → "let me double-check" instead of a confident wrong answer.
- Offline → camera+AI need network; graceful message.
- Rate-limited / daily cap hit (free) → the upsell moment.
- Very long solution → don't truncate (raise proxy token cap for the solve path).

## 13. Build roadmap (ship in slices)
1. **Solve v1:** camera → confirm → solve (reasoning+code) → typeset steps. No paywall yet.
2. **Correctness hardening:** verify step, failure states, math rendering polish.
3. **Paywall + billing:** RevenueCat, free caps, blurred-steps upsell.
4. **Find-my-mistake** (the hero premium feature).
5. **You/Practice:** skill tracking, spaced-repetition practice, streak.
6. **Polish + legal + store listing**, then launch.

## 14. Open decisions (need from you)
- Target band to polish first (school algebra→calculus recommended; architecture stays
  all-levels).
- Store raw photos or not (recommend NOT).
- Price points + whether to include a weekly plan (recommend yes).
- App name + branding (current package: com.danielmatei.intelligence).
