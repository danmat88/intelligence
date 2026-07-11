@AGENTS.md

# Rezolvo — camera-first AI math solver (RO-first, freemium)

Snap/type a math problem → step-by-step typeset solution, machine-verified.
One thread per problem, saved history. Product plan: `docs/PLAN.md` ·
Live status + remaining steps: `docs/ROADMAP.md`.

**This folder (`C:\dev\intelligence`) is the ONE true working copy** — edit and
build here. The old checkout at `C:\Users\coste\OneDrive\Desktop\intelligence`
is a separate stale clone (OneDrive is uninstalled); don't work there.

**Verification culture:** claims about what's on the phone are proven with adb
screenshots (`adb shell "screencap -p /sdcard/x.png"` + pull — quote the shell
command or set `MSYS_NO_PATHCONV=1`, or Git Bash mangles `/sdcard`). The user
expects evidence, not assurances.

## Build & run

- **Local debug build** (EAS Android quota exhausted until ~2026-08-01):
  `cd android; .\gradlew.bat assembleDebug` then
  `adb install -r app\build\outputs\apk\debug\app-debug.apk`.
  Windows long-path fix lives in two gradle pins that **every `expo prebuild`
  WIPES** — re-apply after any prebuild:
  1. `android/app/build.gradle` → `android { externalNativeBuild { cmake { version "3.31.6" } } }`
  2. `android/gradle.properties` → `reactNativeArchitectures=arm64-v8a`
  Also preserve `android/app/debug.keystore` (SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` is registered in Firebase).
  **Prefer avoiding prebuild:** for a new native module, `npx expo install` +
  hand-edit `android/app/src/main/AndroidManifest.xml` (autolinking does the rest)
  — that's how expo-camera shipped.
- **Dev loop:** `npm run dev:client` (fast runtime; plain `expo start` manifests
  time out the dev client), `adb reverse tcp:8081 tcp:8081` after every replug,
  warm the manifest+bundle with curl before opening, then deep link
  `exp+intelligence://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`
  (scheme follows the SLUG `intelligence`; package is `com.rezolvo.app`).
  Helper: `reconnect.ps1` / desktop shortcut `start-dev.cmd`.
- **Expo Go does NOT run this app** (google-signin, RN Firebase, expo-camera).
- `npm test` = jest suites (gemini SSE, markdown, verdict helpers) ·
  `npx tsc --noEmit` before shipping.

## Architecture

- **Solve stack** (`src/solve/`): `solve.ts` routes FAST=`gemini-flash-lite-latest`
  (~2s) → DEEP=`gemini-pro-latest` (fallback on failure/broken JSON, direct for
  proofs, escalation when verification fails). `verifyAnswer` runs the model with
  `tools:[{code_execution:{}}]` (sympy) → `VERDICT: CORRECT|INCORRECT|UNVERIFIABLE`
  → `_verified` badge / silent deep re-solve. `verdict.ts` = pure helpers (tested).
  `prompt.ts`: structured-JSON solve prompt (steps+answer+problem restatement,
  `{LANG}` placeholder) — **never invent a problem from an unreadable image**
  (anti-hallucination rule, device-verified). NO `thinkingConfig` ever (Gemini 3.x
  rejects it). `capture.ts`: clamped crop + 1024px/0.7 JPEG downscale (proxy 1MB cap).
- **Capture** (`src/screens/CaptureScreen.tsx`): in-app dark "visor" (expo-camera
  CameraView, autofocus on) + trim stage with corner-drag crop. Origin-aware nav:
  camera entry → back=arrow to camera, "Refă"; gallery entry → picker opens OVER
  Home (visor mounts only if a photo returns), back=X to Home, ghost="Alege alta"
  (cancel keeps current photo). Hardware back mirrors the visible button.
- **Screen** (`src/screens/SolverScreen.tsx`): hero ↔ thread (CrossFade), composer
  + SymbolBar, solution cards in WebView (`src/components/ui/SolutionView.tsx` —
  KaTeX+marked from CDN, math stashed around markdown, animated height, static
  parabola: no draw animation, unreliable on MIUI). History/Settings = bottom
  sheets on the shared `Overlay` engine (spring + keyboard dismiss both ways).
- **Keyboard rules:** every context switch dismisses (send, chips, +Nouă, load
  problem, overlay open/close, visor open); scroll dismisses on drag; HistorySheet
  rises above the keyboard (`useKeyboardHeight` + capped maxHeight).
- **Auth** (`src/auth/AuthProvider.tsx`): gateless — silent `signInAnonymously`
  whenever session is null; Google sign-in LINKS the anonymous account (same uid,
  work carries over) with fallback to `signInWithCredential` on
  credential-already-in-use; manual profile backfill + `setUser` push (linking
  fires no onAuthStateChanged). WelcomeScreen = offline-only fallback.
- **Data** (`src/solve/store.ts`): `users/{uid}/problems/{id}` docs (title, topic,
  turns, createdAt). **Gotcha:** RNFirebase modular `collection()` must be
  parented on a DocumentReference (`doc(db,'users',uid)`), never a collection.
- **i18n** (`src/i18n/index.tsx`): RO default + EN, `t(key,{vars})`, persisted
  `@rezolvo.lang`; `langName` is injected into solve prompts so the AI answers in
  the app language.
- **Design system:** electric-on-warm-paper (#F7F6F2 bg, #6355FF blurple accent,
  violet→indigo brand gradient #7A5CFF→#4F33EA, #0E9F6E success), Space Grotesk
  display + Inter UI + JetBrains Mono labels (Fraunces only for math glyphs like
  the ∫ watermark; NO emoji in UI ever — Feather icons in tinted tiles),
  graph-paper grid, 720dp content column,
  font scaling capped 1.3× (`Txt`), edge-to-edge. Motion contract (Dan's rules:
  never zoom+opacity TOGETHER — that combo ghosts; and never snappy — short
  durations read as cheap. House style: fully-opaque movement, ~460-560ms,
  easing bezier(0.22,1,0.36,1) long soft tail; scrims may fade): Overlay slides
  content in from below the screen; `CrossFade` is an opaque PUSH in a clipped
  slot (old exits one edge, new enters the other; render-phase snapshot so no
  flash); toasts slide from above; thread bubbles slide from behind the
  composer; solution cards grow (animated height = the reveal, WebView has no
  entrance CSS); presses scale 0.96 depth-only (`Press`, stays fast — feedback,
  not transition).

## Deployed state (2026-07-11)

- Firebase project `gen-lang-client-0286445774`; Android app "Rezolvo"
  `com.rezolvo.app` (`google-services.json` in repo root, NOT gitignored).
  Firestore rules: `users/{uid}/{document=**}` owner-only.
- Cloud Function `gemini` (europe-west1, Node 22 gen2):
  `https://gemini-rgb3szbt2a-ew.a.run.app` — verifies Firebase ID token, model
  whitelist `gemini-flash-latest|gemini-flash-lite-latest|gemini-pro-latest`,
  forwards `tools`, clamps maxOutputTokens ≤ 4096, rate limit 20/min (users) vs
  5/min (anonymous). Secret `GEMINI_API_KEY` in Secret Manager. The raw Gemini
  key lives ONLY in local `.env` as dev fallback — it must never ship in builds.
- Hosting: site `rezolvo` → https://rezolvo.web.app (`web/` folder) — bilingual
  privacy/terms/delete-account + landing. Contact: mathosting@gmail.com.
- EAS project `intelligence` (owner `matdan88-studio`); env for preview+production:
  `EXPO_PUBLIC_AI_PROXY_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
  `EXPO_PUBLIC_GEMINI_MODEL`. firebase CLI logged in as mathosting@gmail.com.
- Launcher icon/splash still show the OLD "Intelligence" mark — Rezolvo logo is
  an open roadmap item.
