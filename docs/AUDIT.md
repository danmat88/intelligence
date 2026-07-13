# Rezolvo — Full professional audit (2026-07-13)

Scope: every runtime surface — auth/guest lifecycle, Firestore/Storage data layer,
solve + verification pipeline, the Gemini proxy, app shell, and engineering
infrastructure. Each finding says what's wrong, why it matters, and the
professional fix. Priorities: **P0** = product promise broken, **P1** = data
lifecycle debt that compounds, **P2** = abuse/cost exposure, **P3** = flying
blind, **P4** = engineering hygiene.

## What is already professional (keep it)

- Token-verified proxy with server-held key, model whitelist, field-by-field
  `generationConfig` whitelisting, clamped `maxOutputTokens`, tools filtering.
- Transactional per-uid rate limiting with TTL self-cleanup.
- Owner-only Firestore + Storage rules; 2MB/content-type caps on upload.
- Anti-hallucination solve prompt (error JSON instead of invented problems) —
  device-verified.
- Abort discipline: account switch / problem switch / reset all kill in-flight
  solves and verifications; Stop returns the question to the composer; Retry
  re-sends the exact request.
- Local-first images with cloud backfill; account deletion covers Storage +
  Firestore + local copies.
- ErrorBoundary + Crashlytics fatal reporting; CI with typecheck + tests +
  functions build.

The app is not "unprofessional" — but the items below are the gap between a
good solo build and how a pro team would ship it.

---

## P0 — The verification engine (the product's core promise)

The "✓ Verificat" badge is the trust story. Today it can lie in four ways.

### P0.1 — Nothing proves the checker actually ran code
`verifyAnswer` sends `tools: [{code_execution:{}}]` and the prompt orders the
model to run sympy — but the client only reads `text` parts
([gemini.ts:105](../src/ai/gemini.ts#L105)). Gemini returns code execution as
separate `executableCode` / `codeExecutionResult` parts, which are silently
dropped. A model that answers **from vibes without executing anything** and
prints `VERDICT: CORRECT` gets the badge. This is the difference between
"machine-verified" and "the same AI said it twice."

**Fix:** stop flattening parts in the verify path. Parse the full parts array;
accept `VERDICT: CORRECT` **only if** at least one `codeExecutionResult` part
with `outcome: OUTCOME_OK` exists in the response. No code run → downgrade to
`unverifiable`, escalate to the deep checker. Unit-test the parts parser.

### P0.2 — The checker is the weakest model
Verification runs on FAST = `gemini-flash-lite-latest` first
([solve.ts:118](../src/solve/solve.ts#L118)). The cheapest model grades the
answer; its own arithmetic slips produce false INCORRECT (triggering a wasted
deep re-solve) and false CORRECT (badging a wrong answer). Pros make the
checker at least as strong as the solver.

**Fix:** verify on `gemini-flash-latest` (mid), escalate to pro. Flash-lite
should never grade.

### P0.3 — Dead escalation path
`parseVerdict` never throws — junk output returns `'unverifiable'` — so the
`catch` in `verifyAnswer` ([solve.ts:117-126](../src/solve/solve.ts#L117-L126))
only fires on network/HTTP errors. A checker that rambles without a verdict
line ends the flow as `unverifiable` **without ever trying the deep model**,
even though the code was clearly written expecting that escalation.

**Fix:** treat "no verdict line" and "no code executed" as escalation triggers,
not just thrown errors.

### P0.4 — Photo problems verify against the model's own restatement
For photo solves the verifier's "problem" is the solver's restatement
(`j?.problem`), and the deep re-solve re-solves that restatement — the original
image is never re-read ([SolverScreen.tsx:272](../src/screens/SolverScreen.tsx#L272)).
If the model misread the photo, verification "confirms" a solution to the wrong
problem, badge and all.

**Fix (two halves):**
1. Keep the `CapturedImage` alongside `lastReqRef` / verifyFlow so the deep
   re-solve re-sends the **image**, not the restatement.
2. Ship the roadmapped "confirm what I read" beat: show the restated problem,
   let the user confirm/fix before the badge means anything. (The schema
   already carries `problem`.)

### P0.5 — Truncation produces silent `unverifiable`
Verify caps at 2500 output tokens; the -latest models think by default and
thoughts can eat the budget mid-verdict. A truncated reply = no verdict line =
badge silently missing, with no signal anywhere.

**Fix:** detect `finishReason: MAX_TOKENS` in the verify/solve paths and treat
it as a retryable failure (escalate), not silence. Related: **pin model
versions** (P2.3) so token/thinking behavior changes are deliberate.

---

## P1 — Firebase user/data lifecycle

> **STATUS 2026-07-13: P1.1–P1.6 all SHIPPED** — `account` fn (server-side
> migrate with block-the-switch + delete), `purgeStaleGuests` (90 days, weekly),
> idempotent `writeProblem`, schema-validating rules + 14 emulator tests in CI,
> `reportNonFatal` wired through. Deployed to production. P2/P0 remain open.

### P1.1 — Guest carry-over orphans the guest's entire tree
The new carry-over (commit b34f2bc) copies problem **docs** into the landed
account, but:
- The guest's Firestore docs are never deleted → orphaned trees accumulate
  forever under uids nobody can ever access again.
- Copied turns still point at `users/{guestUid}/images/…` in Storage. The new
  account **cannot delete those objects** (owner-only rules): "Am greșit poza"
  and problem deletion silently 403 on the storage delete, and account deletion
  (`deleteAllUserImages`) only lists the *own* prefix — so the carried photos
  **survive account deletion**. That breaks the Play data-deletion promise the
  app explicitly makes.
- The orphaned anonymous **auth user** itself also lives forever.

**Fix (server-side migration, the pro pattern):** a callable function
`migrateGuest` that receives BOTH ID tokens (guest + new account), verifies
both, then with the Admin SDK: copies Firestore docs, **copies the Storage
objects to the new uid's prefix and rewrites `imagePath`/`imageUrl`**, deletes
the guest tree (Firestore + Storage), and deletes the anonymous auth user.
Client calls it in the credential-already-in-use branch instead of the current
client-side copy. Atomic enough, rules-proof, leaves nothing behind.

### P1.2 — Anonymous accounts accumulate forever
Every fresh install, every sign-out, every account deletion mints an anonymous
user that lives in Firebase Auth indefinitely (only the rate-limit doc has
TTL). Pros purge them.

**Fix:** scheduled function (weekly): `listUsers` → anonymous accounts with no
sign-in for 90 days → delete auth user + their `users/{uid}` tree + storage
prefix. (After P1.1, most guests worth keeping have been migrated anyway.)

### P1.3 — Account deletion is client-orchestrated
The client loops deletions (images → problem docs → user doc → auth user). If
the app dies mid-way, a half-deleted account remains; if any step fails the
sequencing logic is on the phone. It works at today's scale, but the pro shape
is server-side.

**Fix:** move the data wipe into the same functions codebase — either a
callable `deleteMyAccount` (verify token → admin-delete subtree + storage +
auth user) or keep client `user.delete()` and attach a **`beforeUserDeleted` /
auth onDelete trigger** that wipes data with the Admin SDK. Client keeps only
the reauth + the call.

### P1.4 — `persist()` can create duplicate problem docs
`createProblem` is called wherever `problemIdRef.current` is null, and two
persists race: the parallel photo upload's `.then(persist)` and the solve
completion's `persist(done)` ([SolverScreen.tsx:526-539](../src/screens/SolverScreen.tsx#L526-L539)).
Both can pass the null check before either await resolves → two docs for one
problem, one of them a stub that never heals.

**Fix:** allocate the doc id synchronously up front (`doc(problemsCol(uid))`)
and use `setDoc(..., {merge:true})` everywhere — persistence becomes idempotent
and race-free by construction.

### P1.5 — Rules accept any document shape
`users/{uid}/{document=**}` allows the owner to write **anything**: unbounded
turn arrays, megabyte strings, arbitrary fields, unlimited docs. One bug (or
one tampered client) away from unbounded documents that break the history list.

**Fix:** schema-validating rules for `problems/{id}`: required field types,
`turns` is a list with a max length, string size caps, `createdAt` is a
timestamp; reject unknown top-level fields. Test with the emulator (P4.2).

### P1.6 — Doc drift
CLAUDE.md still says guests get 5/min; the function says 10
([functions/src/index.ts:45](../functions/src/index.ts#L45)). Trivial, but drift
in security-relevant docs is how the next session makes a wrong assumption.

---

## P2 — Abuse & cost exposure (the proxy)

### P2.1 — Anonymous uid farming defeats the rate limit
The per-uid limit is honest work, but minting an anonymous uid costs one
unauthenticated API call with the (public, in-APK) Firebase API key. A 20-line
script mints a uid per 10 requests and burns your Gemini quota all day. The
only global backstop is `maxInstances: 5`.

**Fix: Firebase App Check with Play Integrity**, enforced in the function
(`verifyIdToken` + require a valid App Check token). This is the single biggest
security upgrade available and it's why the pros can offer anonymous access at
all. Needs a native module → batch with the next native-build lot (NetInfo,
Analytics, RevenueCat are already queued there).
Until then: a per-IP burst limit in the function (in-memory or the same
rate_limits pattern keyed by IP) narrows the hole cheaply.

### P2.2 — No server-side daily quota
Roadmap item C already knows this: the freemium ceiling must live in the proxy.
The same `rate_limits` doc can carry a `dayCount`/`dayStart` pair checked in the
same transaction — do it when implementing free-tier limits, not as a separate
system.

### P2.3 — `-latest` model aliases in production
`gemini-*-latest` can silently repoint to a new generation with different
pricing, token accounting, and thinking behavior (the repo already hit this
class of problem with `thinkingConfig`). Pros pin versions and upgrade
deliberately.

**Fix:** pin exact model versions in `solve.ts` + the function whitelist;
review upgrades as commits.

### P2.4 — Minor proxy nits
- Rate-limit quota is consumed **before** the 413 size check — oversized
  requests still burn a slot. Reorder.
- The GCP project should have a **billing budget + alert** — one config click
  that every pro project has.

---

## P3 — Observability (currently flying blind)

### P3.1 — Every failure is swallowed silently
`persist`, `uploadProblemImage`, `verifyFlow`, `copyProblemsInto`,
storage deletes — all end in empty `catch {}`. Correct UX (never block the
user), but nothing is recorded, so a Firestore outage, a broken rules deploy,
or the P1.1 storage 403s would be invisible forever. Crashlytics is installed
but only wired to the ErrorBoundary.

**Fix:** a tiny `reportNonFatal(err, context)` helper wrapping
`crashlytics().recordError` + breadcrumb `log()`; call it in every swallowed
catch. One session of work, permanent eyes.

### P3.2 — No analytics
Zero product signal: solves/day, verify pass rate, guest→Google conversion,
carry-over frequency, where users drop. Freemium pricing decisions (roadmap C)
need this data. Already roadmapped (E) — raise its priority to ship **before**
the paywall, with events: `solve_start/success/fail`, `verify_result`,
`sign_in`, `carry_over`, `share`. Native module → same build lot as App Check.

---

## P4 — Engineering hygiene

### P4.1 — No linter
No ESLint/Prettier anywhere; CI is typecheck + tests only. Add
`eslint-config-expo` + `prettier`, a `lint` script, and a CI step. Also move
`jest`/`jest-expo` to devDependencies (they currently ship in `dependencies`).

### P4.2 — Tests only cover pure helpers
`verdict.ts`, `mathInput`, `shareText`, SSE parsing are tested; the risky code —
solve orchestration, verifyFlow, persistence races, rules — is not. Pro
additions, in value order:
1. **Firestore rules tests** with `@firebase/rules-unit-testing` + the emulator
   (guards P1.5 and every future rules change).
2. Unit tests for the new code-execution parts parser (P0.1) and escalation
   logic (P0.3) — pure functions, easy wins.
3. Emulator-backed tests for `store.ts` (create/update/copy).
4. (Later) one Maestro E2E happy path on the debug APK.

### P4.3 — One Firebase project for everything
Dev testing runs against the production project. At today's scale it's
tolerable; the pro move that costs least: **Firebase Emulator Suite** locally
(auth + firestore + functions + storage) for development and CI, keeping the
cloud project production-only. A `firebase.json` emulators block + an env
switch in the app config.

### P4.4 — Functions deploys are manual
Fine for now (deliberate), but once App Check + quotas land, add a CI deploy
job on main via a service account, so the deployed function is always the
reviewed one.

---

## Recommended sequence

| Phase | Contents | Why this order |
|---|---|---|
| **1. Trust engine** (P0.1–P0.5) | parts parser + code-run proof, checker=flash, real escalation, image re-solve, MAX_TOKENS handling, confirm-what-I-read | It's the product's promise, pure TS, no native builds, immediately testable |
| **2. Lifecycle server-side** (P1.1–P1.4) | `migrateGuest` callable, server-side account wipe, anon purge job, persist idempotency | Closes the Play-policy hole and stops the orphan debt compounding |
| **3. Rules + hygiene** (P1.5, P4.1, P4.2.1-2) | schema rules + emulator rules tests, ESLint in CI | Cheap, locks in phases 1–2 |
| **4. Native lot** (P2.1, P3.2 + queued NetInfo/RevenueCat) | App Check enforced, Analytics events, real offline listener | One prebuild/build cycle, batched like the repo already plans |
| **5. Freemium enforcement** (P2.2) | server-side daily quota in the proxy + paywall | Needs product decisions (free solves/day, price) + analytics from phase 4 |
| Ongoing | P3.1 non-fatals (do inside phase 1–2 files as touched), P2.3 model pinning, P1.6 doc sync, P2.4 nits | Rides along with other work |
