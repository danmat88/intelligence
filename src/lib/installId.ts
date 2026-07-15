import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * A random id minted once per INSTALL and kept in AsyncStorage. The proxy keys
 * the GUEST daily cap on it (X-Rezolvo-Device): anonymous uids are minted
 * fresh on every sign-out, so a uid-keyed guest cap would reset with a simple
 * log-out loop — the install id survives sign-out and only a reinstall resets
 * it. Not a fingerprint, not hardware-derived, never leaves our backend.
 */
const KEY = '@rezolvo.install'

let cached: string | null = null

export async function getInstallId(): Promise<string> {
  if (cached) return cached
  try {
    const stored = await AsyncStorage.getItem(KEY)
    if (stored) return (cached = stored)
  } catch {
    // storage unavailable → fall through to a fresh id (session-scoped)
  }
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  cached = id
  AsyncStorage.setItem(KEY, id).catch(() => {})
  return id
}
