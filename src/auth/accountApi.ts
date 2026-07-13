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
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
 *  it. The token must be freshly minted after a reauth (the server rejects
 *  sign-ins older than 5 minutes). */
export async function deleteAccountOnServer(token: string): Promise<void> {
  const res = await post('/delete', token)
  if (!res.ok) throw new Error(`account deletion failed: ${res.status}`)
}
