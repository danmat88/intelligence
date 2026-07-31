# Profu’ de Mate — Codex Product & Redesign Plan

> Canonical source for the next version of Profu’ de Mate.
>
> Every Codex session must read this file before changing product structure,
> navigation, UI, EN/BAC practice, progress, monetization, or launch flow.
> Update this document when a decision changes. Do not let implementation and
> plan silently drift apart.

Last updated: 29 July 2026

## 1. Product direction

Profu’ de Mate evolves from a reliable camera-first AI math solver into a coherent
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

The shipped interface and AI contract are Romanian-only. Legacy English
catalog entries are dead migration data and must not be reachable by any
learner-facing flow.

## 2. Product architecture

The redesigned application has five clear top-level destinations:

1. **Azi** — the learner's exact continuation, one evidence-backed
   recommendation and current goal.
2. **Subiecte** — the official EN/BAC archive, organized by exam, profile,
   year, session and document type.
3. **Rezolvă** — the central destination for camera, gallery and typed open
   problems, followed by full, guided, hint-only or verification help.
4. **Exersează** — chapters, competencies, configurable tests, generated
   validated practice and new exam simulations.
5. **Caiet** — solved problems, saved work, official papers, tests, mistakes
   and evidence-backed progress.

Account, legal, subscription and settings remain behind the profile control in
the header. They are not primary tabs.

The first-use product explanation and EN/BAC/general choice form a dedicated
onboarding flow. They do not remain on Acasă after completion. A learner may
open Rezolvă before choosing an exam goal.

Progress appears only where it helps a decision: on Acasă, inside an exam
dashboard and in Caietul meu. Caietul must remain useful even before progress
exists by owning solved problems, saved work and attempts. Do not create a
separate empty Progress destination.

### The solver has two roles

1. In the global **Rezolvă** flow, it is an open tool for any mathematics
   problem.
2. In **Subiecte** and **Exersează**, its parsing, explanation, verification and follow-up
   capabilities power a guided teacher that knows the current exercise,
   competency, answer, rubric and attempt state.

Practice must reuse the solver's reliable engine and useful presentation
components without navigating the learner into a generic solver thread or
losing test context. Shared engine does not require identical screens.

## 3. Navigation behavior

Use one shared application frame with a brand/profile header, a content region
and compact five-position bottom navigation. **Rezolvă** occupies the exact
middle position and is visually dominant. Selecting it opens the focused input
flow; active input, camera, review and solution states hide the browsing
navigation. The old three-tab shell and its always-mounted `SolverScreen`
contract are rejected.

The bottom surface must be edge-to-edge and visually absorb the Android gesture
inset so it reads as one surface rather than navigation stacked above a system
bar.

| Context | App navigation | Bottom input/control | Status bar |
| --- | --- | --- | --- |
| Azi | Visible | Hidden | Visible |
| Subiecte browsing | Visible | Hidden | Visible |
| Exersează browsing | Visible | Hidden | Visible |
| Caiet | Visible | Hidden | Visible |
| Rezolvă input/review | Hidden | Contextual action or keyboard | Visible |
| Active solution/thread | Hidden | Follow-up composer visible | Visible |
| Active exercise/test | Hidden | Contextual actions | Visible |
| Camera/crop | Hidden | Hidden | Hidden |
| Settings/paywall panel | Covered by panel | Hidden | Visible |

Do not permanently hide Android system navigation or the status bar. Use an
immersive treatment only where it materially helps, primarily camera/crop.
Hardware back and Android predictive/system back must match the visible
navigation affordance.

The application uses four coordinated chrome modes:

1. Top-level browsing uses the identical Profu’ de Mate wordmark/account header
   on Acasă, Pregătire and Caietul meu.
2. Nested and focused work uses a contextual Back/title/action header and hides
   application navigation.
3. Account, settings, limits and subscription use focused stack routes with
   contextual back navigation. Short confirmations may use dialogs.
4. Camera/crop uses minimal fullscreen controls.

Back from an active solution leaves the focused route without deleting its
saved work. The latest solution can be resumed from Acasă or Caietul meu.
Android Back follows the same hierarchy: topmost overlay/camera first, keyboard
before navigation, focused solve or exercise to its origin, non-Home browsing
destinations to Acasă, and system exit only from Acasă.

The replacement navigation contract must model browsing destinations, focused
flows and overlays separately. Solver session data lives outside the route
component so correct persistence never depends on keeping one giant screen
mounted.

## 4. Core learner journeys

### First session

1. The learner understands in one screen that Profu’ de Mate can solve,
   explain, verify, prepare for exams and retain useful work.
2. They can immediately scan, upload or type a problem.
3. They can choose **Evaluarea Națională** or **BAC** as a preparation goal.
4. If BAC is chosen, they select the official mathematics profile/variant.
5. They may choose **Vreau doar ajutor la matematică** without selecting an
   exam.
6. The app recommends one concrete starting action, not a blank dashboard.

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

Home is adaptive, not a grid of shortcuts that duplicates application
navigation.

New learner state:

- concise product promise and an honest overview of the product's capabilities;
- primary **Rezolvă acum** action;
- EN/BAC/**Doar ajutor la matematică** choice;
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

Preserve the reliable solver engine and its contracts, but replace the existing
`SolverScreen` presentation and monolithic ownership of the entire flow.

Entry and review:

- pressing the global **Rezolvă** action opens a focused full-screen route;
- camera is the primary input method, with gallery and a spacious typed
  mathematics editor as explicit alternatives;
- there are no quick examples, suggestion chips or decorative fake prompts;
- camera and gallery input pass through a clear crop/review/retake step;
- typed input has a purpose-built mathematics toolbar and never looks like a
  cramped chat composer;
- exam/class context can be inherited or added, but never blocks an open solve;
- the final action is unambiguous: **Rezolvă problema**.

Active state:

- the solution is an instructional notebook document rather than a sequence of
  generic chat bubbles;
- its stable anatomy is **Problema**, **Observația-cheie**, **Metoda**,
  **Rezolvare pas cu pas**, **Verificare** and **Răspuns final**, omitting
  sections only when they genuinely do not apply;
- the solution document and **Întreabă-l pe Profu’** composer own the bottom
  edge;
- verification, correction, graphs, figures, sharing, reporting, persistence,
  limits, cancellation and retry behavior must not regress;
- leaving a solution saves it in Caietul meu and permits later continuation.

### Subiecte și Exersează

Exersează opens directly in the learner's saved exam goal. It does not repeat
the large EN/BAC choice already completed on Acasă or in onboarding. Changing
the goal is a secondary action in the exam header.

Exersează presents **Antrenament** and **Simulare** as two mutually exclusive
work modes at the same hierarchy. The learner chooses the mode first, then sees
only the controls relevant to that mode. The screen ends in one primary action;
it does not show a test action and a second competing simulation card at the
same time.

Its primary information architecture is:

1. **Subiecte oficiale** — the archive, grouped by year and then by exam
   session, national simulation and official model; every entry pairs the
   subject with its marking scheme and source provenance.
2. **Simulări** — complete timed papers matching the selected exam and, for
   BAC, the selected mathematics programme.
3. **Teste pe capitole** — substantial validated practice grouped by curriculum
   chapter and competency, not three-item demonstrations presented as a product.
4. **Greșelile mele** — exercises derived from the learner's actual attempts.
5. **Planul meu** — continuation and evidence-backed recommendations.

A short diagnostic may be offered once as an optional placement tool. It is
never the primary preparation catalogue and never substitutes for the archive,
chapter practice or full simulations.

Evaluarea Națională exposes the current official year plus archived years,
beginning with the years available from the Ministry's official archive.
Each year distinguishes the final examination, reserve subject where published,
national simulation and official model.

BAC uses the same anatomy after the EN slice is proven, with an explicit
mathematics profile/variant choice:

- M_mate-info;
- M_șt-nat;
- M_tehnologic;
- M_pedagogic.

BAC archive filters every paper by the chosen programme and clearly separates
the special, June and August sessions, reserve subjects, national simulations
and official models where published.

### Chapter and competency

Each chapter shows what is learned, honest mastery evidence, the next useful
set and prior mistakes. It supports short targeted sets before full tests.

### Official subject

An official subject offers three distinct modes:

1. **Ghidat** — solve question by question with teacher help.
2. **Simulare** — timed, exam-like flow with help restricted by mode.
3. **Studiază** — inspect the subject, expected answers and rubric/barem.

Official and Profu’ de Mate-generated content must be labeled unambiguously.

The archive does not open a generic document-details screen. Every paper card
exposes the three modes directly, so the learner makes one meaningful choice
and enters the first exercise. The selected mode remains visible in the
focused header and Back returns directly to the archive.

### Active exercise or test

The focused screen contains only what supports the attempt:

- exam, year/session when applicable, question index and points;
- problem statement and required figures;
- answer/work input appropriate to the problem;
- **Indiciu**, **Întreabă profesorul** and **Verifică**;
- visible test progress and time only when relevant;
- no primary application navigation.

Teacher help stays inside the active exercise. It opens an inline contextual
panel grounded in the exact statement, competency, expected answer and the
learner's current work. It never navigates into the global solver, discards the
answer or replaces the exercise with a generic chat. The panel gives one
useful observation and one next-step question at a time; the reviewed hint and
worked solution remain explicit separate actions.

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
must distinguish official content from Profu’ de Mate practice.

## 8. Design direction

Profu’ de Mate uses one complete cartoon-classroom visual system across every
surface. Do not combine the former porcelain/violet identity with the new brand.

- warm exercise-book paper with a faint graph grid and restrained doodles;
- navy ink outlines, tomato-red actions, school-bus yellow emphasis and chalk
  green work surfaces;
- Space Grotesk for expressive headings, Inter for UI/body and JetBrains Mono
  only where mathematical/code-like alignment benefits;
- large, friendly editorial hierarchy with compact, functional chrome;
- headings use a restrained mobile scale so the decision, controls and primary
  action remain visible together on a 393 dp Android viewport;
- continuous surfaces instead of a dashboard made from equal card stacks;
- the four top-level browsing destinations fit their primary choices in the available
  viewport without vertical or horizontal scrolling; scrolling is reserved
  for intrinsically long content such as a solution, history or result list;
- one shared wordmark/account header, navigation for Azi/Subiecte/Exersează/
  Caiet and one unmistakable centered Rezolvă action;
- every secondary surface — settings, limits, subscription, dialogs, toasts
  and math input tools — uses the same classroom language,
  rounded outer geometry, compact ink controls and red/yellow/green state signals;
- the open solver is a focused workflow: source selection, camera/gallery
  review or direct mathematics entry, then an instructional solution document;
  it is not a legacy chat screen inside a tab;
- the camera is the sole dark product surface and uses chalk green, cream and
  school-bus yellow rather than the retired violet palette;
- color communicates state and priority, not decoration;
- the generated professor mascot is the brand mark for the launcher, splash,
  wordmark lockup and selected brand moments; it must not become decorative
  clutter on every card;
- a code-native Profu’ de Mate vector icon alphabet for product navigation and
  actions; retain third-party symbols only for protected brand marks such as
  Google, and never use emoji as interface icons;
- one semantic action per icon: brand, solver, premium, torch, streak, limits,
  downloads, legal documents and exam families must not borrow one another's
  glyphs merely because they are visually convenient;
- decorative corner brackets are reserved for the functional camera/crop
  frame; they are not a repeated ornament on cards, buttons, sheets or tabs;
- Azi, Subiecte, Exersează and Caiet share the exact same wordmark header and
  screen-intro geometry. Sheets share one contextual panel header, cover
  application navigation and block all navigation until dismissed;
- dialogs render through one application-level overlay host in the same native
  window as the shell. They never open a second native modal window or recolor
  the transparent Android system-navigation region;
- accessible contrast, touch targets, font scaling and screen-reader labels.

The target is a distinctive, friendly educational product, not a generic AI
chat app, a preschool toy or a dashboard filled with decorative cards.

All product screens compose the same small set of layout primitives:

- `ScreenHeading` for a compact eyebrow, decision-oriented title and optional
  description;
- `SegmentedControl` only for mutually exclusive views at the same hierarchy;
- `PrimaryAction` for the single next action;
- `ProgressMeter` for measured progress;
- `EmptyState` for an honest explanation and, where useful, one recovery
  action.

Feature-specific components own presentation, while screens orchestrate state
and navigation. AI calls, persistence and scoring never live inside decorative
cards. The solver input is split into source selection and typed editor
components; official work uses separate choice, figure, teacher and solution
components.

Motion is playful, tactile and functional:

- preserve the established opaque-push/soft-tail language;
- controls may use a brief squash, press or small settling bounce;
- brand entry may give the professor one purposeful settling movement;
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

Every user-facing string, fallback, permission explanation, account flow,
limit, paywall and error is Romanian. Every AI system prompt requires natural
Romanian explanations and Romanian school terminology and notation. The model
must not answer in English merely because the input, OCR output or upstream
error contains English.

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

- daily caps and the honest limit UI exist;
- unused client billing stubs and the non-functional paywall were removed;
  purchasing stays absent until Google Play and RevenueCat are configured;
- App Check is monitor-only until explicitly enforced.

Sequence:

1. Finalize product architecture and primary UX.
2. Build and validate Acasă, Caietul meu, the focused Rezolvă flow and the
   first EN slice.
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
- [x] Record the July rebuild on-device flows, failures and screenshots on a
  1080 × 2400 Android device.
- [ ] Reconcile remaining stale documentation with implementation.
- [x] Keep Expo 54 as the active redesign baseline; defer Expo 57 to a
  separate laptop migration.
- [x] Reject the July three-tab shell and define Acasă, Pregătire and Caietul
  meu as browsing destinations with Rezolvă as a focused global action.
- [ ] Select and prove the replacement hierarchical route implementation on
  Expo 54 before expanding nested learning routes.
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
- Replace the old three-tab shell with Acasă, Pregătire and Caietul meu plus
  the global Rezolvă action.
- Implement contextual navigation visibility, focused routes, back and
  safe-area behavior.
- Preserve boot/auth behavior and solver state.

### Phase C — Acasă

- Implement new-user and returning-user states.
- Add solve entry, preparation continuation, recommendation and recents.
- Show progress only when supported by real data.

### Phase D — solver integration

- Extract the reliable solver/session engine from the current monolithic screen.
- Build source selection → camera/gallery/type → review → solve → structured
  solution without data loss.
- Hide application navigation throughout the focused solve flow.
- Remove quick examples and enforce Romanian AI output.
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
- Top-level destinations are Azi, Subiecte, Rezolvă, Exersează and Caiet.
- Rezolvă occupies the exact center position and enters a focused full-screen
  workflow; browsing navigation is hidden after entry.
- The old three-tab shell and legacy `SolverScreen` layout are rejected.
- Bottom navigation appears only on top-level browsing surfaces.
- System status/navigation remain available outside purposeful immersive screens.
- The solver is preserved and serves both open solving and grounded teaching.
- Official subject modes are Ghidat, Simulare and Studiază.
- Official subjects are authored as structured, code-native mathematical
  content: prompt blocks, formulas, answer controls, accessible figures,
  expected answers, hint ladders, worked solutions and scoring rubrics.
  No PDF or PDF viewer ships in the learner-facing application. Official PDFs
  may be used only as temporary build-time transcription sources and are
  excluded from the final application bundle. Provenance and the original
  Ministry source URL stay attached to every structured paper.
- Official work resumes at the exact exercise with elapsed time and answers.
  A timed simulation hides hints and solutions until submission, then scores
  deterministic items automatically and clearly identifies any rubric items
  that still require separate verification.
- Profu’ practice and simulations are built from deterministic reviewed
  templates with independently known accepted answers. Simulations hide hints
  and per-item feedback until the final result.
- Exersează uses one Antrenament/Simulare selector and one final primary action;
  inactive-mode controls and competing start cards are hidden.
- Progress is evidence-based and does not yet receive a separate primary
  destination beyond Caietul meu.
- The public brand name is **Profu’ de Mate**. The stable Android package,
  backend headers, storage keys and existing service URLs keep their current
  technical identifiers until a separately planned migration requires change.
- The brand mark is an original friendly older mathematics professor with a
  curled moustache, glasses, red bow tie and teal waistcoat. He points to a
  correctly labeled right triangle and `a² + b² = c²` on a chalkboard.
- Launcher, adaptive, monochrome, store and favicon assets derive from that
  same complete professor-pointing-at-the-board artwork; the launcher does not
  substitute a cropped bust or detached symbol. Platform-specific safe-area
  padding keeps the full scene visible through rounded-square, circle and
  squircle masks. The native splash is deliberately only the warm cream brand
  field; the retained mascot artwork first appears in the animated JavaScript
  lockup.
- Billing and RevenueCat remain near launch, after premium UX is stable.
- Expo 54 remains the active product-development baseline. Expo 57 is a
  separate later migration on a laptop with enough native-build disk space.
- Top-level chrome is a closed contract: Azi, Subiecte, Exersează and Caiet
  receive the same brand/account header; the Rezolvă entry uses focused chrome.
- Solver route state is separate from retained problem, solution and follow-up
  data. Leaving a focused route never destroys saved work.
- The first-use Acasă state explains all important capabilities and collects
  EN, BAC profile or **Doar ajutor la matematică** without blocking a solve.
- Quick examples are not part of the solve entry experience.
- The complete public product and AI explanation layer are Romanian-first;
  temporary English UI or model output is a migration defect.
- All transient panels and dialogs use one root, single-window overlay host.
  This keeps the edge-to-edge background and Android system-navigation region
  visually stable while a panel is open and gives nested dialogs one stacking
  and hardware-back contract.
- First-use explanation and goal selection are a dedicated onboarding flow,
  not permanent Home content. Account, settings, limit and subscription
  destinations are focused screens; overlays are reserved for short,
  reversible confirmations.
- No visible control may exist only to announce that its feature will be built
  later. Incomplete destinations stay out of navigation until their end-to-end
  path is functional.
- Camera and crop are fullscreen root layers above the stable application
  shell, never children constrained by a browsing screen's content area. Opening the
  system gallery does not resize, hide or animate the shell; the fullscreen
  crop layer appears only after an image is actually returned.
- The July shell mockup that mixed new Home/Preparation cards with the legacy
  solver presentation was rejected. All visible surfaces now follow the same
  notebook/ink/chalk cartoon system; only proven solver behavior is retained.

Open — decide before the affected phase:

- Exact EN curriculum source/version and content-authoring workflow.
- Legal/usage decision for official exam assets and derived structured content.
- Exact answer-input model for the first EN exercise types.
- Free versus Premium boundaries for Pregătire and progress.
- The evidence threshold for a readiness/mastery summary.
- Whether real evidence eventually warrants a separate Progress destination
  beyond Caietul meu.

## 15. First implementation target

On the stable Expo 54 baseline, the first product code change replaces the
rejected shell and establishes the new route/session boundary:

- preserve current boot/auth flow;
- expose Azi, Subiecte, Rezolvă, Exersează and Caiet as the five top-level
  destinations, with Rezolvă centered;
- move solver session behavior behind a stable state boundary and replace its
  visible input/solution layout;
- prove navigation visibility and Android safe-area/keyboard/back behavior;
- migrate every touched surface and server prompt to Romanian;
- use honest empty states only; no quick examples, fake progress or generated
  curriculum;
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

## 17. July rebuild audit

The mixed July implementation was audited and rejected as a complete product
refactor. The evidence, replacement boundary and acceptance rules are recorded
in `docs/REFACTOR-AUDIT.md`.

The rebuild preserves validated service and data contracts, but replaces every
visible product surface. Existing screen components are migration sources, not
the target UI, and are removed when their behavior has moved behind the new
feature boundary.
