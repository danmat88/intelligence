import { getCrashlytics, log, recordError } from '@react-native-firebase/crashlytics'

/**
 * Background failures must be VISIBLE (Crashlytics non-fatals), never silent:
 * a broken rules deploy, a dead migration endpoint, or a failing photo upload
 * would otherwise hide inside empty catch blocks forever. Never throws —
 * safe to call from inside any catch.
 */
export function reportNonFatal(e: unknown, context: string): void {
  try {
    const c = getCrashlytics()
    log(c, `[nonfatal] ${context}`)
    recordError(c, e instanceof Error ? e : new Error(String(e)), context)
  } catch {
    // reporting must never become its own failure
  }
}
