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

### Free vs premium — the model question, answered (DECIDED 2026-07-15)
**Everyone gets the good model AND the full steps. The difference is QUANTITY only —
never quality, never blur.**
- **Guest (anonymous):** 2 solves/day, full step-by-step, full verification.
- **Free + Google login:** 5 solves/day, full steps, full history sync.
- **Premium:** unlimited (fair-use), plus find-my-mistake, unlimited follow-up chat,
  practice.

Reasoning: free is the marketing (the "wow" people film for TikTok) — and the steps
with the verified badge ARE the wow. In the ChatGPT era, blurring steps doesn't convert,
it sends students to a free chatbot. We cap the count, not the experience; the upsell
moment is the cap ("Ai rezolvat cele 5 probleme de azi"), hit mid-homework.

### Cost control (non-negotiable — this is how the app survives going viral)
Every free solve costs real API money. Viral growth + no caps = you owe thousands with
zero revenue. So:
- Hard per-user daily cap on free tier (reuse the existing rate-limit machinery).
- Cheap model for reading/explaining; expensive model only for the solve.
- Cache identical problems (a photo of a common textbook problem → reuse the solution).
- Server-side clamp on tokens (already in the proxy).

---

## 4. Free vs Premium (the paywall) — DECIDED 2026-07-15

| Feature | Guest (anon) | Free + Google | Premium |
|---------|--------------|---------------|---------|
| Snap & solve, FULL steps, verified | ✅ 2/day | ✅ 5/day | ✅ unlimited (fair-use) |
| "Find my mistake" (photo of your work) | ❌ | ❌ | ✅ |
| Follow-up questions / chat | 10/problem/day | 10/problem/day | ✅ unlimited |
| Practice problems + skill tracking | ❌ | ❌ | ✅ |
| History / library | last 5 | ✅ full | ✅ full |

**No blurred steps, ever** (Dan's decision 2026-07-15): every solve a user gets is the
full-quality experience. The paywall trigger is the DAILY CAP — an honest "Ai rezolvat
cele 5 probleme de azi — revino mâine sau treci la Premium" screen, hit mid-homework
with problems still left. Login carrot is the 2→5 jump + full history. Follow-up chat
is capped at 10/problem/day on free (generous for learning; blocks the "solve new
problems in chat" side door — the followup prompt also refuses brand-new problems).
The counters live SERVER-SIDE in the proxy (client-side caps are decoration), and the
GUEST counter is keyed to the INSTALL id, not the uid — anonymous uids are minted fresh
on every sign-out, so uid-keying would make "log out, get 2 more" an infinite loop.

Pricing — set RON price points MANUALLY in Play Console (never auto-convert; users
always pay local currency, we control the number):
- **Monthly 24.99 RON** (~$5.40)
- **Yearly 119.99 RON** (~10 RON/mo effective — the "obvious deal"; 3-day trial here)
- **Weekly 9.99 RON** (exam-week impulse buy; deliberately expensive per-day)

Net revenue per monthly sub: 24.99 − 21% VAT − 15% Google ≈ **~17.5 RON (~$3.80)**.

---

## 5. Screens & flows

Bottom tabs: **Solve · Practice · You** (Solve is the landing screen).

**Input decision (2026-07-15): NO structured math-keyboard editor.** The pros
(Photomath/Mathway) built WYSIWYG math editors because their CAS parsers required
unambiguous syntax; our solver is Gemini and reads messy plain text fine. We ship
free-text composer + SymbolBar (√, ^, π, fractions…) + the typeset "AM CITIT"
restatement as the trust loop. A live KaTeX preview while typing is a possible
later nicety — a full editor is weeks of work solving a problem we don't have.

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
- **Status 2026-07-15:** everything account-independent is BUILT — server daily cap,
  limit/paywall sheets, billing stub, RevenueCat webhook, rules. Day-one steps for
  when the accounts exist: `docs/LAUNCH-CHECKLIST.md`.
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
- One monthly subscriber nets ~17.5 RON (~€3.5) → covers hundreds of Flash-priced solves;
  one yearly (119.99 RON, net ~€17) covers a LOT of free-user solves.
- Target: keep free-tier API burn below what a healthy % of converters bring in. Watch it
  weekly at launch; tighten caps if burn outruns revenue.

## 11. Distribution (the real fight — harder than building)
- **RO-first launch:** store listing Romanian-primary (EN as secondary listing language),
  availability restricted to Romania + Moldova at launch so reviews/ASO concentrate in
  our market (expanding later = one checkbox). Currency follows the user automatically;
  we only control the RON price points.
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

## 14. Decisions log
- **DECIDED 2026-07-15 — free tier:** no blurred steps ever; full quality for everyone,
  capped by quantity: guest 2/day · logged-in 5/day · Premium unlimited.
- **DECIDED 2026-07-15 — pricing:** 24.99 RON/mo · 119.99 RON/yr (3-day trial) ·
  9.99 RON/wk, set manually in Play Console; RO+MD availability at launch.
- **DECIDED 2026-07-15 — input:** free text + SymbolBar + typeset restatement;
  no structured math-keyboard editor.
- **DECIDED 2026-07-15 — anti-abuse:** guest cap keyed per INSTALL (sign-out
  can't reset it); chat capped 10/problem/day free; solve prompt returns
  {"error"} for typed non-problems (commands/chit-chat/gibberish) — guarded by
  `npm run eval:prompts` (20 fixed cases, run on every prompt change).
- **DECIDED — name/branding:** Rezolvo, package `com.rezolvo.app` (logo still open).
- **DECIDED — photos:** stored in Firebase Storage (migration/deletion handle them).
- **DECIDED 2026-07-15 — guest history stays FULL** (login has enough carrots:
  2→5 solves, cross-device sync); the "last 5" idea from the old table is dead.
- **DONE 2026-07-15 — hygiene:** `-latest` model aliases removed from the proxy
  whitelist (pinned ids only); usage pill "X/Y azi" live in the header;
  NetInfo instant offline; Analytics events flowing (device-verified);
  App Check monitor-only on the proxy (API enablement = console click).
- Still open: target band to polish first (school algebra→calculus recommended;
  architecture stays all-levels).
