import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore'
import { reportNonFatal } from '../lib/report'

/**
 * The user's entitlement, read live from users/{uid}.tier — the doc the
 * RevenueCat webhook maintains (functions/src/revenuecat.ts). Owner-readable,
 * never client-writable (firestore.rules): the app only ever REACTS to the
 * tier; the server is the one source of truth, and the proxy enforces the
 * daily cap on its own copy of the same doc, so a hacked client gains nothing.
 */
export type Tier = 'free' | 'premium'

export function subscribeTier(uid: string, cb: (tier: Tier) => void): () => void {
  return onSnapshot(
    doc(getFirestore(), 'users', uid),
    (snap) => {
      const d = snap.data() as { tier?: string; premiumUntil?: { toMillis?: () => number } } | undefined
      const until = d?.premiumUntil?.toMillis?.()
      cb(d?.tier === 'premium' && (!until || until > Date.now()) ? 'premium' : 'free')
    },
    (err) => {
      reportNonFatal(err, 'tier-subscribe')
      cb('free') // fail closed: display-wise the user is free until proven otherwise
    },
  )
}
