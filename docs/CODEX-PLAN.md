# Rezolvo — Codex Product & Redesign Plan

> Canonical source for the next version of Rezolvo.
>
> Every Codex session must read this file before changing product structure,
> navigation, UI, EN/BAC practice, progress, monetization, or launch flow.
> Update this document when a decision changes. Do not let implementation and
> plan silently drift apart.

Last updated: 22 July 2026

## 1. Product direction

Rezolvo evolves from a reliable camera-first AI math solver into a coherent
Romanian mathematics learning and exam-preparation product.

The existing solve, verify, camera, history, account, persistence, metering,
and Firebase systems are production foundations. The redesign wraps and
extends them; it does not replace them without a demonstrated need.

Primary promise:

**Rezolvă ce te blochează acum. Înțelege. Exersează. Intră pregătit la examen.**

Public v1 scope:

- Romania only, with Romanian as the product and content language.
- Mathematics only.
- Evaluarea Națională and BAC are the two exam families.
- Evaluarea Națională is the first complete vertical slice.
- BAC reuses the validated learning, test, scoring and progress architecture.
- The app does not ask for age. Exam, class and BAC profile are content choices.

Existing English localization may remain temporarily while the interface is
rebuilt, but new v1 product work is Romanian-first and must not depend on an
English equivalent. Removing stale English strings is cleanup, not a blocker
for the first learning slice.

## 2. Product architecture

The first redesigned shell has three primary destinations:

1. **Acasă** — the learner's current goal and next useful action.
2. **Rezolvă** — free-form camera, gallery or typed mathematics help.
3. **Pregătire** — structured EN/BAC learning, practice and simulations.

Account, legal, subscription and settings remain behind the profile control in
the header. They are not primary tabs.

Progress initially appears where it helps a decision: on Acasă, inside an exam
dashboard and in Profile. It becomes a fourth tab only after real usage proves
that it deserves a permanent destination. Do not create an empty Progress tab.

### The solver has two roles

1. In **Rezolvă**, it is an open tool for any mathematics problem.
2. In **Pregătire**, its parsing, explanation, verification and follow-up
   capabilities power a guided teacher that knows the current exercise,
   competency, answer, rubric and attempt state.

Practice must reuse the solver's reliable engine and useful presentation
components without navigating the learner into a generic solver thread or
losing test context. Shared engine does not require identical screens.

## 3. Navigation behavior

Use a bottom application tab bar on top-level surfaces. It must be edge-to-edge
and visually absorb the Android gesture inset so it reads as one surface, not a
tab bar stacked above a system bar.

| Context | App tab bar | Bottom input/control | Status bar |
| --- | --- | --- | --- |
| Acasă | Visible | Hidden | Visible |
| Rezolvă idle | Visible | Solve input lives in page | Visible |
| Rezolvă typing | Hidden | Keyboard/composer owns bottom | Visible |
| Active solution/thread | Hidden | Follow-up composer visible | Visible |
| Pregătire browsing | Visible | Hidden | Visible |
| Active exercise/test | Hidden | Contextual actions | Visible |
| Camera/crop | Hidden | Hidden | Hidden |
| Settings/paywall sheet | Covered by sheet | Hidden | Visible |

Do not permanently hide Android system navigation or the status bar. Use an
immersive treatment only where it materially helps, primarily camera/crop.
Hardware back and Android predictive/system back must match the visible
navigation affordance.

Decision for the first redesign slice: use a small, typed local application
shell on the stable Expo 54 baseline. It owns the three top-level destinations
and keeps the solver mounted while a learner switches tabs; no new native
navigation dependency or development build is required for this slice. Its
explicit tab/chrome contract leaves room for nested practice routes later.
Do not build the shell twice just to accommodate a later SDK migration.

## 4. Core learner journeys

### First session

1. The learner understands in one screen that Rezolvo solves and teaches math.
2. They can immediately scan, upload or type a problem.
3. They can choose **Evaluarea Națională** or **BAC** as a preparation goal.
4. If BAC is chosen, they select the official mathematics profile/variant.
5. The app recommends one concrete starting action, not a blank dashboard.

Account creation must not block the first successful solve or the first useful
practice interaction. Preserve anonymous-first authentication.

### Returning session

1. Acasă shows the current exam goal and a clear **Continuă pregătirea** action.
2. One recommendation is derived from the latest meaningful attempts.
3. The learner can start a quick test or camera solve with one tap.
4. Recent work is available without dominating the page.

Do not show invented readiness scores, fake streaks or empty progress graphs.
When there is not enough evidence, say so plainly and recommend a diagnostic
or first practice set.

## 5. Screen specification

### Acasă

Home is adaptive, not a grid of shortcuts that duplicates the tab bar.

New learner state:

- concise product promise;
- primary **Rezolvă acum** action;
- EN/BAC preparation choice;
- small proof of how guidance works.

Returning learner state:

- current exam goal/profile;
- **Continuă pregătirea** with exact next item;
- one recommended weak competency or diagnostic;
- quick test;
- quick camera action;
- recent work;
- an honest weekly summary once enough data exists.

### Rezolvă

Preserve the existing solver engine and its reliability contracts.

Idle state:

- camera is the primary action;
- gallery and typed input are clear alternatives;
- the input is part of the page rather than permanently stacked above tabs;
- examples guide without cluttering the screen.

Typing and active state:

- focusing typed input enters a focused solve surface and hides app tabs;
- an active solution/thread hides app tabs;
- the solution document and follow-up composer own the bottom edge;
- verification, correction, graphs, figures, sharing, reporting, persistence,
  limits, cancellation and retry behavior must not regress.

### Pregătire

The landing page lets the learner choose or resume an exam goal.

Evaluarea Națională initially exposes:

- **Continuă**;
- test rapid;
- capitole și competențe;
- subiecte oficiale;
- simulare completă;
- greșelile mele;
- progres relevant.

BAC uses the same anatomy after the EN slice is proven, with an explicit
mathematics profile/variant choice:

- M_mate-info;
- M_șt-nat;
- M_tehnologic;
- M_pedagogic.

### Chapter and competency

Each chapter shows what is learned, honest mastery evidence, the next useful
set and prior mistakes. It supports short targeted sets before full tests.

### Official subject

An official subject offers three distinct modes:

1. **Ghidat** — solve question by question with teacher help.
2. **Simulare** — timed, exam-like flow with help restricted by mode.
3. **Studiază** — inspect the subject, expected answers and rubric/barem.

Official and Rezolvo-generated content must be labeled unambiguously.

### Active exercise or test

The focused screen contains only what supports the attempt:

- exam, year/session when applicable, question index and points;
- problem statement and required figures;
- answer/work input appropriate to the problem;
- **Indiciu**, **Întreabă profesorul** and **Verifică**;
- visible test progress and time only when relevant;
- no primary app tab bar.

### Results

Results are instructional, not only celebratory:

- total score and score by rubric item;
- result for each exercise;
- explanation and correct method;
- weak competencies supported by attempt evidence;
- recommended next set;
- **Reîncearcă greșelile**.

### Profile and progress

Profile owns identity, settings and account actions. Learning views can show:

- exam goal and BAC profile;
- competency mastery and weak areas;
- score evolution;
- recent tests and solved problems;
- streak only if it promotes meaningful work;
- the next recommended action.

## 6. Teacher and feedback contract

The AI teacher is a pedagogical layer grounded in the active exercise. It must
know the curriculum metadata, official or validated solution, scoring rubric,
learner attempt and prior hints.

It should be able to explain:

- the theory or formula needed;
- how to recognize the problem type;
- why a method applies;
- the next step without revealing everything;
- a learner's specific mistake;
- a full solution when explicitly requested or after the attempt;
- how to verify the result;
- a similar transfer problem.

Use a help ladder: clarify the task → prompt recall → small hint → next step →
check the learner's step → fuller explanation. Simulations record or restrict
help so the final score is not presented as an unaided exam score.

The model is not the scoring authority. Expected answers, rubric logic and
deterministic or independent verification decide correctness where possible.
The interface distinguishes **verificat**, **comparat cu baremul** and an AI
explanation. Never imply certainty that the system did not establish.

Do not implement practice as an unconstrained prompt such as “generate a BAC
test.” Generated content must follow reviewed templates, curriculum boundaries
and independent answer validation.

## 7. Content and learning data model

Real practice requires a structured content layer, not only PDF files or chat
prompts.

Core entities:

- exam (`evaluare_nationala`, `bac`);
- subject (`matematica`) and BAC profile where relevant;
- curriculum and exam-structure version/year;
- chapter and competency;
- source document, year, session and official/generated status;
- exercise and reusable exercise template;
- prompt blocks, figures and accessibility text;
- difficulty and estimated duration;
- expected answer, accepted forms, worked solution and scoring rubric;
- hint ladder and teacher context;
- attempt, answer/work, duration, hints/help used and rubric score;
- mastery evidence and next recommendation.

Official or archived exam content needs a documented source, provenance and
usage decision before shipping. Availability on an official website does not,
by itself, settle commercial redistribution rights. Until that decision is
recorded, prototypes may store source metadata and links but must not silently
ship a copied commercial corpus.

Generated exercises must remain identifiable internally, be constrained by a
reviewed template and have a separately verified answer. User-facing labels
must distinguish official content from Rezolvo practice.

## 8. Design direction

Rezolvo uses one complete visual system across every surface. Do not combine
legacy warm-paper screens with redesigned product screens.

- cool porcelain canvas with a restrained violet atmosphere;
- near-black ink surfaces and a violet-to-indigo action signal;
- Space Grotesk for expressive headings, Inter for UI/body and JetBrains Mono
  only where mathematical/code-like alignment benefits;
- large editorial hierarchy with compact, functional chrome;
- continuous surfaces instead of a dashboard made from equal card stacks;
- the three top-level idle screens fit their primary choices in the available
  viewport without vertical or horizontal scrolling; scrolling is reserved
  for intrinsically long content such as a solution, history or result list;
- one shared wordmark/account header and one floating three-destination dock;
- every transient surface — settings, history, limits, subscription, dialogs,
  toasts and math input tools — uses the same floating porcelain/ink language,
  30 px outer geometry, compact dark controls and violet state signals;
- the open solver is a visual workbench: scanner stage, direct text entry and
  a solution document, not a legacy chat screen inside a new tab;
- color communicates state and priority, not decoration;
- a code-native Rezolvo vector icon alphabet for product navigation and
  actions; retain third-party symbols only for protected brand marks such as
  Google, and never use emoji as interface icons;
- accessible contrast, touch targets, font scaling and screen-reader labels.

The target is a premium educational product, not a generic AI chat app and not
a dashboard filled with decorative cards.

Motion remains calm and functional:

- preserve the established opaque-push/soft-tail language;
- avoid simultaneous zoom and opacity transitions;
- transitions explain navigation or state change;
- respect reduced motion;
- never let polish make input, camera or solving feel slower.

## 9. Technical constraints to preserve

Do not regress these existing contracts:

- Firebase anonymous-first auth and safe guest-to-Google migration.
- Server-side account deletion including photos.
- Stable per-problem ids and idempotent persistence.
- Local-first problem images with cloud sync/backfill.
- Server-side free-tier metering and premium entitlement enforcement.
- Pinned Gemini models and server-side model/parameter whitelisting.
- Code-backed verification before showing **Verificat**.
- Abort/cancel discipline across reset, account and problem changes.
- Firestore schema rules and emulator tests.
- Offline detection, non-fatal reporting and analytics.
- Existing keyboard and safe-area behavior unless deliberately improved and
  device-verified.

Romanian is the v1 product language. Existing localization infrastructure may
remain during migration, but it must not make Romanian copy inconsistent or
force new English content work.

## 10. Expo and native strategy

Current state:

- Expo SDK 54 / React Native 0.81.5.
- Project instructions require consulting the exact Expo SDK 57 documentation
  before writing code.
- The current root is a custom single-screen application without a navigation
  library; `SolverScreen` owns most solver UI and state.
- Expo 57 migration is deferred to a separate controlled technical project on
  a laptop with enough disk space for a complete native build.

Do not combine the Expo 57 migration, navigation redesign and curriculum
backend in one change. The current application shell and learning work proceed
on Expo 54. When scheduled separately, the upgrade proceeds incrementally
through SDK 55, 56 and 57 and verifies every native boundary.

Any native change must preserve the repository-specific Android build pins and
debug/Firebase signing configuration documented in `CLAUDE.md`.

## 11. Monetization and launch sequencing

Billing is intentionally late, but not a launch-day afterthought.

Current foundation:

- daily caps, limit UI, paywall UI, tier subscription and RevenueCat webhook
  foundations exist;
- the client purchase adapter is still a stub;
- App Check is monitor-only until explicitly enforced.

Sequence:

1. Finalize product architecture and primary UX.
2. Build and validate Acasă, Rezolvă integration and the first EN slice.
3. Stabilize premium feature boundaries from real product behavior.
4. Enforce App Check after real-build token verification.
5. Configure Google Play products and RevenueCat.
6. Replace the billing stub and use localized store prices.
7. Test purchase, cancellation, renewal, expiration, refund and restore on a
   Play testing track with license testers.
8. Complete legal/store forms and launch only after end-to-end evidence.

Potential premium boundaries remain a later decision. Correctness feedback,
clear pricing and account recovery must never be dark-patterned.

## 12. Delivery phases

### Phase A — product specification and baseline

- [x] Confirm Romania-only, Romanian, mathematics, EN + BAC direction.
- [x] Confirm EN as the first complete vertical slice.
- [x] Define the three product areas and the solver's dual role.
- [ ] Record current on-device flows, failures and screenshots.
- [ ] Reconcile remaining stale documentation with implementation.
- [x] Keep Expo 54 as the active redesign baseline; defer Expo 57 to a
  separate laptop migration.
- [x] Use the typed local application shell for the three top-level
  destinations on Expo 54; defer a navigation-library decision for future
  nested learning routes.
- [ ] Confirm the EN curriculum source/version and content workflow.

### Phase T — Expo 57 technical boundary

This deferred dedicated phase does not block the current redesign and does not
include new navigation, product UI or curriculum work.

- Upgrade incrementally SDK 54 → 55 → 56 → 57 as Expo recommends.
- Reconcile dependencies and native configuration deliberately.
- Preserve Android build pins and Firebase signing behavior.
- Pass automated checks, Android build and real-device smoke testing.

### Phase B — design system and application shell

- Consolidate design tokens and reusable header/navigation primitives.
- Implement Acasă, Rezolvă and Pregătire destinations.
- Implement contextual tab-bar visibility, back and safe-area behavior.
- Preserve boot/auth behavior and solver state.

### Phase C — Acasă

- Implement new-user and returning-user states.
- Add solve entry, preparation continuation, recommendation and recents.
- Show progress only when supported by real data.

### Phase D — solver integration

- Place the current solver under Rezolvă without rewriting its engine.
- Transition idle → focused input → active thread without data loss.
- Hide tabs when the thread/composer owns the bottom edge.
- Device-verify keyboard, back, camera, history and account changes.

### Phase E — EN complete vertical slice

Build one end-to-end path before broadening the catalog:

1. Choose/resume Evaluarea Națională Mathematics.
2. Open one curated chapter and competency.
3. Complete a short set of validated exercises.
4. Request a grounded hint or teacher explanation.
5. Submit and receive rubric-based feedback.
6. View results, a real mastery update and next recommendation.
7. Leave and resume without losing state.

The slice is complete only when content provenance, persistence, analytics,
accessibility, error/offline states and real-device behavior are credible.

### Phase F — EN breadth and official modes

- Expand chapters and validated template coverage.
- Add official-subject study and guided modes after the source decision.
- Add short diagnostics and full timed simulation.
- Add mistakes practice and stronger recommendations.

### Phase G — BAC

- Add official BAC mathematics variants/profiles.
- Map competencies, rubrics and content to the shared practice architecture.
- Validate each profile independently; do not treat BAC as one generic exam.

### Phase H — launch completion

- Finalize premium boundaries, App Check and RevenueCat/Play Billing.
- Run E2E and device-matrix testing.
- Complete brand/store assets, legal and Play forms.
- Release through internal and closed testing before production.

## 13. Validation gates

Every material phase must pass proportionate checks:

- `npm test -- --runInBand`
- `npx tsc --noEmit`
- `npm --prefix functions run build` when functions change
- `npm run test:rules` when data/rules change
- relevant prompt evaluation when prompts/models change
- Android build for native or navigation-shell changes
- real-device screenshots and interaction verification for user-facing claims
- keyboard, system back, safe area, offline, accessibility and font scaling

Do not mark a phase complete based only on TypeScript or a web preview.

## 14. Decisions and open decisions

Decided:

- Public v1 is Romanian, mathematics-only and built for Romania.
- Both Evaluarea Națională and BAC belong in the product.
- EN is the first complete implementation slice; BAC follows on shared systems.
- The three tabs are Acasă, Rezolvă and Pregătire.
- Bottom navigation appears only on top-level browsing surfaces.
- System status/navigation remain available outside purposeful immersive screens.
- The solver is preserved and serves both open solving and grounded teaching.
- Official subject modes are Ghidat, Simulare and Studiază.
- Progress is evidence-based and does not yet receive a primary tab.
- The brand mark is the violet-to-indigo radical/check symbol.
- The native splash stays warm paper; the mark enters in the animated
  JavaScript brand beat instead of appearing twice.
- Billing and RevenueCat remain near launch, after premium UX is stable.
- Expo 54 remains the active product-development baseline. Expo 57 is a
  separate later migration on a laptop with enough native-build disk space.
- The first shell uses a local typed tab controller rather than adding a native
  navigation dependency. The bottom bar owns only Acasă, Rezolvă and
  Pregătire; the solver can temporarily hide it for focused work.
- The July shell mockup that mixed new Home/Preparation cards with the legacy
  solver presentation was rejected. All visible surfaces now follow the same
  porcelain/ink/violet system; only proven solver behavior is retained.

Open — decide before the affected phase:

- Exact EN curriculum source/version and content-authoring workflow.
- Legal/usage decision for official exam assets and derived structured content.
- Exact answer-input model for the first EN exercise types.
- Free versus Premium boundaries for Pregătire and progress.
- The evidence threshold for a readiness/mastery summary.
- When Progress earns a fourth primary tab.

## 15. First implementation target

On the stable Expo 54 baseline, the first product code change is
the application shell and state contract—not the entire learning platform at
once:

- preserve current boot/auth flow;
- expose Acasă, Rezolvă and Pregătire as top-level destinations;
- keep the existing `SolverScreen` functional under Rezolvă;
- prove tab visibility and Android safe-area/keyboard/back behavior;
- use honest local placeholder states only for navigation scaffolding;
- do not ship fake progress, generated curriculum or billing changes in this
  slice.

The next vertical feature after the shell is the smallest complete EN path
defined in Phase E.

## 16. Change discipline

- Read this document before relevant work.
- State which phase is being changed.
- Keep changes scoped and device-verifiable.
- Update decisions here in the same commit that changes their implementation.
- If code and this plan disagree, stop and resolve the discrepancy explicitly.
- Never silently reinterpret an open decision as settled.
