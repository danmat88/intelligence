import { getAuth } from '@react-native-firebase/auth'
import { createGeminiClient } from './gemini'

export type { AIClient, AIResult, GenerateOptions } from './types'

/**
 * The single AI entry point for the whole app. Swap the provider HERE and
 * nothing else changes.
 *
 * Production mode (EXPO_PUBLIC_AI_PROXY_URL set): requests go to our Cloud
 * Function proxy, authenticated with the signed-in user's Firebase ID token.
 * The Gemini API key lives ONLY on the server - nothing to extract from the APK.
 *
 * Dev fallback (no proxy URL): talks straight to Gemini with the local .env
 * key, so the app still works before the backend is deployed.
 */
const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL ?? ''
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''
const model = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash'

export const ai = proxyUrl
  ? createGeminiClient({
      model,
      baseUrl: proxyUrl,
      getAuthToken: async () => (await getAuth().currentUser?.getIdToken()) ?? null,
    })
  : createGeminiClient({ apiKey, model })

/** True once a key or proxy is present — lets the UI nudge you to set one up. */
export const AI_CONFIGURED = proxyUrl.length > 0 || apiKey.length > 0

/** Which model the app is currently pointed at (for display/debug). */
export const AI_MODEL = model
