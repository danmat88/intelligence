import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { OAuth2Client } from 'google-auth-library'
import { randomUUID } from 'node:crypto'
import { underRateLimit } from './ratelimit'

/**
 * Account lifecycle endpoint — the server-side owner of every operation that
 * crosses identities or destroys data. The client only ever proves who it is
 * (Firebase ID token + a Google ID token where a second identity is involved);
 * the Admin SDK does the actual moving and wiping that security rules
 * correctly forbid on the client.
 *
 *   POST /migrate  body {googleIdToken}  auth: GUEST token
 *     The guest is signing into a Google account that ALREADY exists, so
 *     linking is impossible and the client must switch uids. This moves the
 *     guest's whole tree into the target account FIRST — problem docs AND the
 *     photos in Storage (fresh download tokens, refs rewritten) — then deletes
 *     the guest's Firestore tree, Storage folder, and auth user. The client
 *     only performs the switch after this succeeds: a failure means the user
 *     stays a guest with everything intact (block-the-switch contract).
 *
 *   POST /delete   auth: token with auth_time < 5 min (client reauths first)
 *     Deletes the account and every trace of it: Storage prefix, Firestore
 *     subtree, rate-limit doc, auth user. This is what makes the Play-policy
 *     data-deletion promise literally true — including photos that were
 *     migrated in from a guest session.
 */

// The OAuth *web* client id the app mints Google ID tokens against
// (google-services.json, client_type 3). Public by nature — this is audience
// pinning, not a secret: a Google token minted for any other app is rejected.
const WEB_CLIENT_ID = '781036746021-g2p1lnmu4617b25042lgo6pc13a1tblu.apps.googleusercontent.com'
const googleVerifier = new OAuth2Client()

const STORAGE_HOST = 'https://firebasestorage.googleapis.com/v0/b'

// Destroying an account is not something a fast finger should be able to do
// twice, and migration lists+copies with admin powers — keep both rare.
const ACCOUNT_RATE_LIMIT = 5 // requests / minute / uid
// Deletion demands a RECENT sign-in (the client reauthenticates right before).
const MAX_AUTH_AGE_S = 5 * 60

/** Every trace of a uid: Storage prefix, Firestore subtree, rate-limit doc,
 *  auth user. Shared by /delete, /migrate (guest teardown) and the scheduled
 *  guest purge. Idempotent — a retry after partial failure just re-runs. */
export async function wipeUserData(uid: string): Promise<void> {
  const db = getFirestore()
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` })
  await db.recursiveDelete(db.doc(`users/${uid}`))
  await db.doc(`rate_limits/${uid}`).delete()
  try {
    await getAuth().deleteUser(uid)
  } catch (e) {
    // a retried run already deleted the auth user — that's success, not failure
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e
  }
}

/** Move users/{fromUid} into users/{toUid}: photos first (copy + fresh
 *  download token), then problem docs with image refs rewritten, then the
 *  guest tree is destroyed. Docs keep their ids so a retried half-migration
 *  overwrites instead of duplicating. Returns how many problems moved. */
async function migrateTree(fromUid: string, toUid: string): Promise<number> {
  const db = getFirestore()
  const bucket = getStorage().bucket()

  const [files] = await bucket.getFiles({ prefix: `users/${fromUid}/images/` })
  const movedImages = new Map<string, { path: string; url: string }>()
  for (const f of files) {
    const dest = f.name.replace(`users/${fromUid}/`, `users/${toUid}/`)
    const token = randomUUID()
    const [copy] = await f.copy(bucket.file(dest))
    // The tokened URL is what the app's <img> tags load — mint a fresh one
    // owned by the destination object (the old token dies with the old object).
    await copy.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } })
    movedImages.set(f.name, {
      path: dest,
      url: `${STORAGE_HOST}/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`,
    })
  }

  const snap = await db.collection(`users/${fromUid}/problems`).get()
  const writer = db.bulkWriter()
  for (const d of snap.docs) {
    const data = d.data()
    if (Array.isArray(data.turns)) {
      data.turns = data.turns.map((t: { imagePath?: string; imageUrl?: string }) => {
        const moved = t?.imagePath ? movedImages.get(t.imagePath) : undefined
        return moved ? { ...t, imagePath: moved.path, imageUrl: moved.url } : t
      })
    }
    writer.set(db.doc(`users/${toUid}/problems/${d.id}`), data)
  }
  await writer.close()

  // Only now — everything safely owned by the target — is the guest disposable.
  await wipeUserData(fromUid)
  return snap.size
}

export const account = onRequest(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB', maxInstances: 2 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
    if (!bearer) {
      res.status(401).json({ error: 'Missing auth token' })
      return
    }
    let decoded
    try {
      decoded = await getAuth().verifyIdToken(bearer[1])
    } catch {
      res.status(401).json({ error: 'Invalid or expired auth token' })
      return
    }
    if (!(await underRateLimit(decoded.uid, ACCOUNT_RATE_LIMIT))) {
      res.status(429).json({ error: 'Too many requests - please wait a moment.' })
      return
    }
    const isGuest = decoded.firebase?.sign_in_provider === 'anonymous'

    try {
      if (req.path.endsWith('/migrate')) {
        // Only a guest has work that needs carrying — a Google-signed session
        // asking to "migrate" is a tampered client.
        if (!isGuest) {
          res.status(403).json({ error: 'Only guest sessions migrate' })
          return
        }
        const googleIdToken = (req.body as { googleIdToken?: unknown } | undefined)?.googleIdToken
        if (typeof googleIdToken !== 'string' || !googleIdToken) {
          res.status(400).json({ error: 'Missing googleIdToken' })
          return
        }
        // The Google token proves the caller really holds the target identity —
        // without this check, any guest could dump docs into any account.
        let payload
        try {
          const ticket = await googleVerifier.verifyIdToken({ idToken: googleIdToken, audience: WEB_CLIENT_ID })
          payload = ticket.getPayload()
        } catch {
          res.status(401).json({ error: 'Invalid Google token' })
          return
        }
        if (!payload?.sub) {
          res.status(401).json({ error: 'Invalid Google token' })
          return
        }
        let target
        try {
          target = await getAuth().getUserByProviderUid('google.com', payload.sub)
        } catch {
          // linking failed with email-already-in-use: same email, provider not
          // yet attached — the email lookup finds the account the switch lands in
          if (payload.email) target = await getAuth().getUserByEmail(payload.email).catch(() => undefined)
        }
        if (!target) {
          res.status(404).json({ error: 'No existing account for this Google identity' })
          return
        }
        const migrated = target.uid === decoded.uid ? 0 : await migrateTree(decoded.uid, target.uid)
        logger.info(`[account] migrated ${migrated} problem(s): ${decoded.uid} -> ${target.uid}`)
        res.json({ migrated })
        return
      }

      if (req.path.endsWith('/delete')) {
        // Guests can't reauthenticate (no credential exists); Google sessions
        // must prove recent presence before destruction.
        if (!isGuest) {
          const authAge = Math.floor(Date.now() / 1000) - (decoded.auth_time ?? 0)
          if (authAge > MAX_AUTH_AGE_S) {
            res.status(401).json({ error: 'Recent sign-in required' })
            return
          }
        }
        await wipeUserData(decoded.uid)
        logger.info(`[account] deleted account ${decoded.uid}`)
        res.json({ ok: true })
        return
      }

      res.status(404).json({ error: 'Unknown operation' })
    } catch (e) {
      // Partial work is safe to retry (idempotent by construction) — surface a
      // clean 500 so the client blocks the switch / shows the delete error.
      logger.error('[account] operation failed', e)
      res.status(500).json({ error: 'Account operation failed - please retry.' })
    }
  },
)
