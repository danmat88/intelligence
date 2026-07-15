import { getApp } from '@react-native-firebase/app'
import { initializeAppCheck, getToken, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check'

/**
 * App Check — proof that requests come from OUR app on a real device, not a
 * script with a stolen anonymous token. Dev builds use the debug provider
 * (register the logcat debug token in Firebase console → App Check); release
 * builds use Play Integrity (attestation works once distributed via Play).
 *
 * Rollout is MONITOR-ONLY: the proxy verifies the token when present and just
 * logs when it's missing/invalid (functions/src/gemini.ts). Enforcement is a
 * single env flip (APPCHECK_ENFORCE=true) AFTER the installed fleet sends
 * tokens — flipping it earlier would lock out every existing install.
 */
let instance: Promise<Awaited<ReturnType<typeof initializeAppCheck>> | null> | null = null

/** Call once at boot. Safe on builds without the native module (no-op). */
export function initAppCheck() {
  if (instance) return
  instance = (async () => {
    try {
      const provider = new ReactNativeFirebaseAppCheckProvider()
      provider.configure({
        android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
        apple: { provider: 'debug' },
      })
      return await initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true })
    } catch {
      return null // native module not in this build yet — requests just go untagged
    }
  })()
}

/** Current App Check token for the proxy header, or null when unavailable.
 *  The SDK caches and auto-refreshes — this is cheap after the first fetch. */
export async function getAppCheckToken(): Promise<string | null> {
  try {
    const ac = await instance
    if (!ac) return null
    const t = await getToken(ac, false)
    return t.token || null
  } catch {
    return null
  }
}
