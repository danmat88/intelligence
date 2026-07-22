# Rezolvo — Codex Product & Redesign Plan

> Canonical source for the next version of Rezolvo.
>
> Every Codex session must read this file before changing product structure,
> navigation, UI, EN/BAC practice, progress, monetization, or launch flow.
> Update this document when a decision changes. Do not let implementation and
> plan silently drift apart.

Last updated: 20 July 2026

## 1. Product direction

Rezolvo evolves from a strong camera-first AI math solver into a coherent
Romanian-first learning and exam-preparation product.

The existing solve, verify, camera, history, account, persistence, metering,
and Firebase systems are valuable production foundations. The redesign must
wrap and extend them, not casually rewrite them.

Primary promise:

**Solve what blocks you now, then practice what will make you stronger next.**

Initial market and curriculum focus:

- Romania-first, Romanian default, English supported.
- Evaluarea Națională — Mathematics is the first structured practice target.
- BAC follows after the practice architecture and learning model are proven.
- The app does not ask for age. Exam/class/profile are learning-content choices.

## 2. Core product areas

The first redesigned shell uses three primary destinations:

1. **Acasă** — personalized overview and the next useful action.
2. **Rezolvă** — camera, gallery, typed problem, solution and follow-ups.
3. **Exersează** — exam preparation, chapters, targeted practice and tests.

Account, language, legal, subscription and settings remain behind the profile
control in the header; they are not a primary tab.

Progress initially lives across Acasă and Profile. It becomes a fourth tab only
when the app has enough meaningful learning data to justify a permanent
destination. Do not add an empty or decorative Progress tab.

## 3. Navigation behavior

Use a bottom application tab bar on top-level surfaces. It must be edge-to-edge
and visually absorb the Android gesture inset so it reads as one surface, not a
tab bar stacked above a system bar.

Visibility rules:

| Context | App tab bar | Composer | Status bar |
| --- | --- | --- | --- |
| Acasă | Visible | Hidden | Visible |
| Rezolvă idle | Visible | Main solve input only | Visible |
| Active solution/thread | Hidden | Follow-up composer visible | Visible |
| Exersează browsing | Visible | Hidden | Visible |
| Active practice/test | Hidden | Contextual controls | Usually visible |
| Camera/crop | Hidden | Hidden | Hidden |
| Keyboard open | Never stacked above keyboard | Relevant input only | Visible |
| Settings/paywall sheet | Covered or visually behind sheet | Hidden | Visible |

Do not permanently hide Android system navigation or the status bar. Use
immersive treatment only where it materially helps, primarily camera/crop.

Hardware back and Android predictive/system back behavior must always match the
visible navigation affordance.

## 4. Screen intent

### Acasă

Home is not a grid of decorative shortcuts and does not duplicate the tab bar.
It adapts to user state.

New user:

- Understand the product immediately.
- Reach the first successful solve with minimal friction.
- Choose EN/BAC preparation only when ready.

Returning learner:

- Continue the current preparation goal.
- See one honest weekly-progress summary.
- Receive one recommended next action or weak chapter.
- Access a daily/quick test.
- Reopen recent work.
- Reach camera solve immediately.

### Rezolvă

Preserve the existing solver engine and its reliability contracts.

Idle state:

- Camera is the primary action.
- Typed input and gallery are clear alternatives.
- Examples may guide without cluttering the page.

Active state:

- The app tab bar disappears.
- The existing solution document and follow-up composer own the bottom edge.
- Verification, correction, graphs, figures, sharing, reporting, persistence,
  limits, cancellation and retry behavior must not regress.

### Exersează

First useful slice:

- Evaluarea Națională — Mathematics.
- Browse by curriculum chapter/competency.
- Individual targeted exercises.
- A short test mode.
- Result, explanation and next recommendation.

Later:

- Full timed simulations and official structure.
- BAC by relevant profile.
- Adaptive difficulty.
- Practice from prior mistakes.
- Spaced repetition and stronger progress insights.

Do not implement practice as an unconstrained prompt saying “generate a BAC
test.” Content must follow a controlled curriculum and validated templates.

### Profile / progress

Profile owns identity and settings. Learning progress should show actionable
information, not vanity statistics:

- current exam goal;
- topic mastery and weak areas;
- score evolution;
- recent tests and solved problems;
- streak only if it encourages useful learning;
- recommended next action.

## 5. Design direction

Keep and mature the existing warm-paper Rezolvo identity:

- warm paper base;
- blurple accent and existing brand gradient;
- strong readable typography;
- restrained graph-paper references;
- generous spacing and clear hierarchy;
- fewer unnecessary containers;
- color communicates state and priority, not decoration;
- Feather/system-consistent icons, no emoji as interface icons;
- accessibility and font scaling remain first-class.

The target is a premium educational product, not a generic AI chat app and not
a dashboard filled with decorative cards.

Motion remains calm and functional:

- preserve the established opaque-push/soft-tail language;
- avoid simultaneous zoom + opacity transitions;
- transitions explain navigation or state change;
- respect reduced-motion behavior when introduced;
- never allow polish to make input, camera or solving feel slower.

## 6. Learning data model — required before real practice

Practice and progress require explicit concepts such as:

- exam (`evaluare_nationala`, later `bac`);
- subject and BAC profile where relevant;
- curriculum version/year;
- chapter and competency;
- exercise/template id and source type;
- difficulty;
- expected answer and scoring rubric;
- attempt result, score, duration and hints used;
- mastery/progress state;
- next recommendation.

Official or archived exam content needs a documented source and usage decision.
AI-generated content needs constrained templates plus deterministic or
independent answer verification.

## 7. Technical constraints to preserve

Do not regress these existing contracts:

- Firebase anonymous-first auth and safe guest-to-Google migration.
- Server-side account deletion including photos.
- Stable per-problem ids and idempotent persistence.
- Local-first problem images with cloud sync/backfill.
- Server-side free-tier metering and premium entitlement enforcement.
- Pinned Gemini models and server-side model/parameter whitelisting.
- Code-backed verification before showing “Verificat”.
- Abort/cancel discipline across reset, account and problem changes.
- Firestore schema rules and emulator tests.
- RO/EN localization.
- Offline detection, non-fatal reporting and analytics.
- Existing keyboard and safe-area behavior unless deliberately improved and
  device-verified.

## 8. Expo and native strategy

Current app state at plan creation:

- Expo SDK 54 / React Native 0.81.5.
- Project instructions require consulting exact Expo SDK 57 documentation
  before writing code.
- Expo 57 migration is a separate controlled technical project.

Do not combine the Expo 57 migration, navigation redesign and curriculum
backend in one change. Choose and verify boundaries deliberately.

Any native change must preserve the repository-specific Android build pins and
debug/Firebase signing configuration documented in `CLAUDE.md`.

## 9. Monetization and launch sequencing

Billing is intentionally late, but not a launch-day afterthought.

Current state:

- daily caps, limit UI, paywall UI, tier subscription and RevenueCat webhook
  foundations exist;
- the client purchase adapter is still a stub;
- App Check is monitor-only until explicitly enforced.

Sequence:

1. Finalize product architecture and primary UX.
2. Build and validate Home, Rezolvă integration and first Practice slice.
3. Stabilize premium feature boundaries.
4. Enforce App Check after real-build token verification.
5. Configure Google Play products and RevenueCat.
6. Replace the billing stub and use localized store prices.
7. Test purchase, cancellation, renewal, expiration, refund and restore on a
   Play testing track with license testers.
8. Complete legal/store forms and launch only after end-to-end evidence.

## 10. Delivery phases

### Phase A — product specification and baseline

- Record current on-device flows and screenshots.
- Reconcile stale documentation with the implementation.
- Confirm navigation anatomy and screen states.
- Confirm the first EN curriculum slice.

### Phase B — design system and application shell

- Consolidate tokens and reusable navigation/header primitives.
- Implement the three-destination shell.
- Implement contextual tab-bar visibility and safe-area behavior.
- Preserve existing boot/auth behavior.

### Phase C — new Home

- Implement new-user and returning-user states.
- Add fast solve entry, preparation continuation, recommendation and recents.
- Use honest placeholders only where the data system is intentionally pending.

### Phase D — Solver integration

- Place the current solver under Rezolvă.
- Transition idle → active thread without remount/data loss.
- Hide app tabs when the thread/composer owns the bottom edge.
- Device-verify keyboard, back, camera, history and account changes.

### Phase E — Practice foundation

- Define curriculum and attempt schemas.
- Implement EN Mathematics chapter browsing.
- Implement targeted exercise and short-test flows.
- Reuse the solve/explanation/verification engine where appropriate.

### Phase F — useful progress

- Persist attempts and mastery signals.
- Add actionable Home/Profile progress views.
- Decide with real content whether Progress deserves a fourth tab.

### Phase G — launch completion

- App Check enforcement.
- RevenueCat/Play Billing.
- E2E and device matrix testing.
- Brand/store assets, legal and Play forms.
- Internal/closed testing, then production.

## 11. Validation gates

Every material phase must pass proportionate checks:

- `npm test -- --runInBand`
- `npx tsc --noEmit`
- `npm --prefix functions run build` when functions change
- `npm run test:rules` when data/rules change
- relevant prompt evaluation when prompts/models change
- Android build for native or navigation-shell changes
- real-device screenshots and interaction verification for user-facing claims
- keyboard, system back, safe area, offline and font-scaling checks

Do not mark a phase complete based only on TypeScript or a web preview.

## 12. Current decisions and open decisions

Decided:

- Rezolvo's brand mark is the violet-to-indigo radical/check symbol: a math
  problem resolving into a verified answer. The launcher, Android adaptive and
  monochrome icons, favicon, Play icon and in-app lockup share this identity.
- Keep the native splash as bare warm paper; the new mark enters in the
  existing animated JavaScript brand beat instead of appearing twice.
- Bottom navigation is appropriate for top-level product areas.
- Start with three tabs: Acasă, Rezolvă, Exersează.
- Hide app tabs during active solver threads, tests and camera flows.
- Keep system status/navigation available outside purposeful immersive screens.
- Preserve the solver engine while redesigning the product around it.
- First structured curriculum target is Evaluarea Națională Mathematics.
- Billing and RevenueCat remain near launch, after premium UX is stable.

Open — decide before the affected phase:

- Exact Home composition after current-device baseline review.
- Navigation implementation choice after Expo-version strategy is confirmed.
- Whether Expo 57 migration happens before or after the first redesign shell.
- Exact EN curriculum source/version and content authoring workflow.
- Free versus Premium boundaries for Practice and progress.
- When Progress earns a fourth primary tab.

## 13. Change discipline

- Read this document before relevant work.
- State which phase is being changed.
- Keep changes scoped and device-verifiable.
- Update decisions here in the same commit that changes their implementation.
- If code and this plan disagree, stop and resolve the discrepancy explicitly.
- Never silently reinterpret an open decision as settled.
