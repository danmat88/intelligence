import { getAuth } from '@react-native-firebase/auth'
import { createGeminiClient } from './gemini'
import { getInstallId } from '../lib/installId'
import { getAppCheckToken } from '../lib/appcheck'

export type { AIClient, AIResult, GenerateOptions } from './types'

/**
 * The single AI entry point for the whole app. Swap the provider HERE and
 * nothing else changes.
 *
 * Production mode (EXPO_PUBLIC_AI_PROXY_URL set): requests go to our Cloud
 * Function proxy, authenticated with the signed-in user's Firebase ID token.
 * The Gemini API key lives ONLY on the server - nothing to extract from the APK.
 *
 * Even development builds use the proxy. A raw Gemini key is never referenced
 * by app code and therefore cannot be bundled into an APK.
 */
const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL ?? ''
const model = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3.1-flash-lite'

export const ai = createGeminiClient({
  model,
  baseUrl: proxyUrl || 'https://proxy-not-configured.invalid',
  getAuthToken: async () => (await getAuth().currentUser?.getIdToken()) ?? null,
  getDeviceId: getInstallId, // guests are capped per install, not per (disposable) uid
  getAppCheckToken, // required by the production proxy
})

/** True once a key or proxy is present — lets the UI nudge you to set one up. */
export const AI_CONFIGURED = proxyUrl.length > 0

/** Which model the app is currently pointed at (for display/debug). */
export const AI_MODEL = model
