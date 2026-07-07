import { createGeminiClient } from './gemini'

export type { AIClient, AIResult, GenerateOptions } from './types'

/**
 * The single AI entry point for the whole app. Swap the provider HERE and
 * nothing else changes.
 *
 * ⚠️ Security: for the prototype we call Gemini directly with the key baked in
 * via EXPO_PUBLIC_*. That key ships inside the app and can be extracted, so
 * before publishing, stand up a Firebase Cloud Function proxy and set
 * `baseUrl` to it (and drop the key from the client). One-line change.
 */
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''
const model = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash'

export const ai = createGeminiClient({ apiKey, model })

/** True once a key is present — lets the UI nudge you to set one up. */
export const AI_CONFIGURED = apiKey.length > 0

/** Which model the app is currently pointed at (for display/debug). */
export const AI_MODEL = model
