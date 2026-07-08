@AGENTS.md

## Build / deploy status (handoff note — 2026-07-08)

This project is set up for **EAS cloud builds** (Expo), not local builds.

- **Expo account/org:** `matdan88-studio` (owner set in app.json; logged-in CLI user is `matdan88`)
- **Expo project:** https://expo.dev/accounts/matdan88-studio/projects/intelligence
- **Config:** `eas.json` (profiles: development / preview / production). Android keystore is auto-generated and stored on Expo servers.
- Start a build: `npx eas-cli build --platform android --profile preview` · List: `npx eas-cli build:list --limit 5`
- Gemini env vars (`EXPO_PUBLIC_GEMINI_API_KEY` sensitive, `EXPO_PUBLIC_GEMINI_MODEL`) are set on EAS for preview + production. `.env` is local-only and never uploaded.

## Architecture (Firebase backend)

- **Auth:** Firebase Auth with Google provider — `src/auth/AuthProvider.tsx` (google-signin → idToken → `signInWithCredential`). Required sign-in gate in `App.tsx` → `WelcomeScreen`.
- **Data:** Firestore `users/{uid}/conversations/{id}/messages/{id}` — `src/chat/store.tsx` (live snapshots, offline cache, fire-and-forget writes; streaming reply lives in a local draft bubble, only the finished message is written). Rules in `firestore.rules`.
- **AI:** `functions/src/index.ts` — Cloud Function `gemini` (europe-west1) proxies Gemini, verifies the Firebase ID token, holds the API key as secret `GEMINI_API_KEY`, pins the model server-side. Client hits it when `EXPO_PUBLIC_AI_PROXY_URL` is set (`src/ai/index.ts`); without it, dev fallback calls Gemini directly with the local key.
- **Keyboard:** react-native-keyboard-controller (`KeyboardProvider` in App.tsx, `KeyboardAvoidingView` in ChatScreen with `keyboardVerticalOffset={-insets.bottom}`).
- **Expo Go does NOT run this app** (native modules: google-signin, RN Firebase). Use a development build (`--profile development` + `npx expo start --dev-client`).

### Deployed state (2026-07-08 — all backend setup DONE)
- Firebase project: `gen-lang-client-0286445774` (attached to the user's AI Studio Google Cloud project). `google-services.json` in repo root (NOT gitignored — EAS needs it). Firestore database created (eur3), rules deployed.
- Function `gemini` live at `https://europe-west1-gen-lang-client-0286445774.cloudfunctions.net/gemini` (Node 22 gen2; verified 401 without token). Secret `GEMINI_API_KEY` v1 in Secret Manager. Artifact cleanup policy set (1 day).
- EAS env (preview + production): `EXPO_PUBLIC_AI_PROXY_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GEMINI_MODEL`. The raw `EXPO_PUBLIC_GEMINI_API_KEY` was deliberately DELETED from EAS (key must never ship in builds; it stays in local `.env` as dev fallback only).
- firebase CLI logged in as mathosting@gmail.com; `.firebaserc` points at the project.

### Notes
- The local `android/` folder is **gitignored leftover** from an earlier local build attempt — EAS regenerates the native project from `app.json`. Safe to delete.
