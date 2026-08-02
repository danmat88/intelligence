import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAnalytics, setAnalyticsCollectionEnabled, setConsent } from '@react-native-firebase/analytics'
import { getCrashlytics, setCrashlyticsCollectionEnabled } from '@react-native-firebase/crashlytics'

const KEY = '@rezolvo/privacy/optional-diagnostics-v1'
let enabled = false

async function apply(next: boolean): Promise<void> {
  enabled = next
  await Promise.allSettled([
    setConsent(getAnalytics(), {
      analytics_storage: next,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    }),
    setAnalyticsCollectionEnabled(getAnalytics(), next),
    setCrashlyticsCollectionEnabled(getCrashlytics(), next),
  ])
}

/** Native auto-collection is disabled in firebase.json, so the default is a
 * real opt-out even before JavaScript starts. */
export async function initTelemetryConsent(): Promise<boolean> {
  const consent = (await AsyncStorage.getItem(KEY).catch(() => null)) === 'enabled'
  await apply(consent)
  return consent
}

export function isTelemetryEnabled(): boolean {
  return enabled
}

export async function setTelemetryConsent(next: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, next ? 'enabled' : 'disabled')
  await apply(next)
}

export async function readTelemetryConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY).catch(() => null)) === 'enabled'
}
