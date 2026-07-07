# intelligence

A Gemini-powered mobile app (Expo + React Native + TypeScript). This is the
**foundation** — a clean, provider-agnostic AI layer with a working demo. The
specific product gets built on top later.

## Run it

```bash
npm install          # already done by the scaffold
npm start            # opens Expo — scan the QR with Expo Go on your phone
# npm start -c       # same, but clears the cache (use after changing .env)
```

Install **Expo Go** on your phone (App Store / Play Store), scan the QR from
`npm start`, and the app opens live on your device.

## Set your Gemini key

1. Get a free key: https://aistudio.google.com/apikey
2. Open `.env` and paste it into `EXPO_PUBLIC_GEMINI_API_KEY=`
3. Restart with `npm start -c` (env changes need a cache clear)

`.env` is gitignored — your key never gets committed.

## How the AI layer works

Everything imports from **`src/ai`** and nothing else:

```ts
import { ai } from './src/ai'

const { text, ms } = await ai.generate('Explain X simply')
// vision:
const { text } = await ai.generate('What is in this photo?', {
  image: { base64, mimeType: 'image/jpeg' },
})
```

- `src/ai/types.ts` — the provider-agnostic `AIClient` interface
- `src/ai/gemini.ts` — Gemini implementation via plain `fetch` (text + vision)
- `src/ai/index.ts` — picks the provider + reads config. **Swap providers here.**

## Before you publish (security)

The prototype calls Gemini directly with the key baked into the app. That key
can be extracted from a shipped app. Before release, put a **Firebase Cloud
Function** between the app and Gemini and set `baseUrl` in `src/ai/index.ts`
to it — then remove the key from the client. One-line change; the rest of the
app is unaffected.

## Adding Firebase (when the app needs accounts / data / storage)

```bash
npx expo install firebase
```

Then fill the `EXPO_PUBLIC_FIREBASE_*` values in `.env` (see `.env.example`)
and create `src/firebase.ts` to initialise it. Deferred until the product
actually needs it — no point carrying it before then.
