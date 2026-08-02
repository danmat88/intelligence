import { getInstallId } from '../lib/installId'
import { getAppCheckToken } from '../lib/appcheck'

/**
 * Client for the `account` Cloud Function — the server-side owner of every
 * cross-identity or destructive account operation. Same wire pattern as the
 * AI proxy and the Storage REST calls: plain fetch with a Firebase ID token,
 * no extra native module.
 */
const BASE = process.env.EXPO_PUBLIC_ACCOUNT_API_URL ?? ''

async function post(path: string, token: string, body?: object): Promise<Response> {
  // Unconfigured = fail loudly. The callers treat any failure as "block the
  // destructive/cross-account action", so a missing env var can never cause
  // silent data loss — it just refuses until the URL is set.
  if (!BASE) throw new Error('account API not configured (EXPO_PUBLIC_ACCOUNT_API_URL)')
  const deviceId = await getInstallId().catch(() => null)
  const appCheckToken = await getAppCheckToken().catch(() => null)
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(deviceId ? { 'X-Rezolvo-Device': deviceId } : {}),
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

/** Move the guest's whole tree (docs + photos) into the existing account the
 *  user is signing into. MUST be called while still signed in as the guest,
 *  BEFORE the uid switch. Returns how many problems were carried over. */
export async function migrateGuestWork(guestToken: string, googleIdToken: string): Promise<number> {
  const res = await post('/migrate', guestToken, { googleIdToken })
  if (!res.ok) throw new Error(`migrate failed: ${res.status}`)
  const data = (await res.json()) as { migrated?: number }
  return data.migrated ?? 0
}

/** Server-side account deletion: Storage + Firestore + the auth user, all of
 *  it. Named accounts require a fresh reauth; anonymous sessions are deleted
 *  using their current Firebase session because no external identity exists. */
export async function deleteAccountOnServer(token: string): Promise<void> {
  const res = await post('/delete', token)
  if (!res.ok) throw new Error(`account deletion failed: ${res.status}`)
}

export type AccountExport = {
  format: 'rezolvo-account-export'
  version: number
  generatedAt: string
  identity: { uid: string; email: string | null; signInProvider: string | null }
  firestore: { account: unknown; documents: Array<{ path: string; data: unknown }> }
  storage: Array<{
    path: string
    contentType: string | null
    size: number
    updatedAt: string | null
    downloadUrl: string
    downloadUrlExpiresAt: string
  }>
}

/** Portable snapshot of profile, history, attempts, responses, saved work and
 * a short-lived download link for every uploaded image. */
export async function exportAccountData(token: string): Promise<AccountExport> {
  const res = await post('/export', token)
  if (!res.ok) throw new Error(`account export failed: ${res.status}`)
  return res.json() as Promise<AccountExport>
}
