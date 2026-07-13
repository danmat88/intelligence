import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// Per-user fixed-window rate limit. The window doc lives at the Firestore
// root (rate_limits/{uid}), which client security rules don't expose - only
// these functions (Admin SDK) can touch it. Transactional, so parallel
// requests can't slip past the ceiling. Guests (anonymous sign-in) get a
// tighter ceiling: fresh anonymous uids are free to mint, so their allowance
// must be small enough that farming them is pointless.
export const RATE_LIMIT = 20 // requests / window, signed-in users
// One user-visible solve can legitimately spend up to ~7 requests (solve
// FAST+DEEP, verify FAST+DEEP, deep re-solve, re-verify) — the guest ceiling
// must clear a single worst-case flow, or a guest's FIRST hard problem eats
// the whole window and the next tap shows "busy".
export const RATE_LIMIT_GUEST = 10 // requests / window, anonymous guests
export const RATE_WINDOW_MS = 60_000 // per minute

export async function underRateLimit(uid: string, limit: number): Promise<boolean> {
  const ref = getFirestore().collection('rate_limits').doc(uid)
  return getFirestore().runTransaction(async (tx) => {
    const now = Date.now()
    const data = (await tx.get(ref)).data() as { windowStart: number; count: number } | undefined
    if (!data || now - data.windowStart >= RATE_WINDOW_MS) {
      // expiresAt drives Firestore's TTL garbage collection: every throwaway
      // anonymous uid leaves a window doc here, and TTL deletes it a day
      // after the user's last activity — the collection stops growing forever.
      tx.set(ref, { windowStart: now, count: 1, expiresAt: Timestamp.fromMillis(now + 24 * 3600 * 1000) })
      return true
    }
    if (data.count >= limit) return false
    tx.update(ref, { count: data.count + 1 })
    return true
  })
}
