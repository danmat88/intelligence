import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { getFirestore, type DocumentData, type DocumentReference } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { OAuth2Client } from 'google-auth-library'
import { underRateLimit } from './ratelimit'
import { APP_CHECK_ENFORCED, hasValidAppCheckToken } from './appcheck'

/**
 * Server-side owner of cross-identity, export and destructive account work.
 * The client proves identity; the Admin SDK performs the privileged operation.
 *
 *   POST /migrate {googleIdToken} as guest
 *   POST /export as any authenticated user
 *   POST /delete with a recent non-anonymous sign-in
 */

// Public OAuth audience used to verify the Google token that identifies the
// migration target. Deployment may override it without changing source.
const WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID ?? '781036746021-g2p1lnmu4617b25042lgo6pc13a1tblu.apps.googleusercontent.com'
const googleVerifier = new OAuth2Client()
const ACCOUNT_RATE_LIMIT = 5
const MAX_AUTH_AGE_S = 5 * 60

/** Every server-side trace addressable by uid. The optional install id removes
 * the guest meter as well; purge jobs cannot know it, but those counters have
 * a 48-hour Firestore TTL. Idempotent so partial operations are safe to retry. */
export async function wipeUserData(uid: string, deviceId?: string): Promise<void> {
  const db = getFirestore()
  await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` })
  await db.recursiveDelete(db.doc(`users/${uid}`))

  const cleanup = db.batch()
  cleanup.delete(db.doc(`rate_limits/${uid}`))
  cleanup.delete(db.doc(`rate_limits/account_${uid}`))
  cleanup.delete(db.doc(`daily_solves/${uid}`))
  if (deviceId && /^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) {
    cleanup.delete(db.doc(`daily_solves/device_${deviceId}`))
  }
  await cleanup.commit()

  try {
    await getAuth().deleteUser(uid)
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
  }
}

type CollectedDoc = { relativePath: string; data: DocumentData }

/** Enumerate every descendant doc, including nested response subcollections. */
async function collectUserDocs(uid: string): Promise<CollectedDoc[]> {
  const out: CollectedDoc[] = []
  const walk = async (parent: DocumentReference, parentPath: string): Promise<void> => {
    const collections = await parent.listCollections()
    for (const collection of collections) {
      const snap = await collection.get()
      for (const doc of snap.docs) {
        const relativePath = parentPath
          ? `${parentPath}/${collection.id}/${doc.id}`
          : `${collection.id}/${doc.id}`
        out.push({ relativePath, data: doc.data() })
        await walk(doc.ref, relativePath)
      }
    }
  }
  await walk(getFirestore().doc(`users/${uid}`), '')
  return out
}

/** Recursively updates private image paths while preserving Firestore
 * Timestamp and other special values (which are not plain objects). */
function rewriteStorageRefs(value: unknown, moved: Map<string, { path: string }>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteStorageRefs(item, moved))
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value

  const source = value as Record<string, unknown>
  const rewritten: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(source)) rewritten[key] = rewriteStorageRefs(item, moved)

  const oldPath = typeof source.imagePath === 'string' ? source.imagePath : null
  const replacement = oldPath ? moved.get(oldPath) : undefined
  if (replacement) {
    rewritten.imagePath = replacement.path
    delete rewritten.imageUrl
  }
  return rewritten
}

async function destinationExists(paths: string[]): Promise<Set<string>> {
  const db = getFirestore()
  const existing = new Set<string>()
  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100)
    if (chunk.length === 0) continue
    const snaps = await db.getAll(...chunk.map((path) => db.doc(path)))
    snaps.forEach((snap, offset) => {
      if (snap.exists) existing.add(chunk[offset])
    })
  }
  return existing
}

/** Every imported top-level document receives a deterministic guest prefix,
 * so a collision can never discard data. The learning profile is the sole
 * exception: the destination account's existing choice intentionally wins. */
function importedRelativePath(relativePath: string, fromUid: string): string {
  const parts = relativePath.split('/')
  if (parts.length >= 2 && parts[0] !== 'profile') {
    parts[1] = `guest_${fromUid}_${parts[1]}`
  }
  return parts.join('/')
}

/** Carry the complete guest subtree into an existing Google account.
 * Destination documents win on collision, so existing profile and paid state
 * are never replaced by guest state. Guest Storage goes into a deterministic
 * namespace, which prevents collisions and makes retries idempotent. */
async function migrateTree(fromUid: string, toUid: string, deviceId?: string): Promise<number> {
  const db = getFirestore()
  const bucket = getStorage().bucket()

  const [files] = await bucket.getFiles({ prefix: `users/${fromUid}/` })
  const movedFiles = new Map<string, { path: string }>()
  for (const file of files) {
    const relative = file.name.slice(`users/${fromUid}/`.length)
    const destination = `users/${toUid}/imports/${fromUid}/${relative}`
    await file.copy(bucket.file(destination))
    movedFiles.set(file.name, { path: destination })
  }

  const docs = await collectUserDocs(fromUid)
  const destinationPaths = docs.map(
    (doc) => `users/${toUid}/${importedRelativePath(doc.relativePath, fromUid)}`,
  )
  const existing = await destinationExists(destinationPaths)
  const writer = db.bulkWriter()
  for (const doc of docs) {
    const destination = `users/${toUid}/${importedRelativePath(doc.relativePath, fromUid)}`
    if (!existing.has(destination)) {
      writer.set(db.doc(destination), rewriteStorageRefs(doc.data, movedFiles) as DocumentData)
    }
  }
  await writer.close()

  await wipeUserData(fromUid, deviceId)
  return docs.filter((doc) => /^problems\/[^/]+$/.test(doc.relativePath)).length
}

/** JSON-safe, explicit encoding for Firestore values used in portability
 * exports. Timestamps remain distinguishable from ordinary strings. */
function exportValue(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(exportValue)
  if (value instanceof Date) return { type: 'date', value: value.toISOString() }
  if (Buffer.isBuffer(value)) return { type: 'bytes', value: value.toString('base64') }
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return { type: 'timestamp', value: (value as { toDate: () => Date }).toDate().toISOString() }
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, exportValue(item)]),
    )
  }
  return String(value)
}

async function buildAccountExport(decoded: DecodedIdToken) {
  const db = getFirestore()
  const bucket = getStorage().bucket()
  const [root, docs, files] = await Promise.all([
    db.doc(`users/${decoded.uid}`).get(),
    collectUserDocs(decoded.uid),
    bucket.getFiles({ prefix: `users/${decoded.uid}/` }).then(([items]) => items),
  ])
  const expires = Date.now() + 15 * 60 * 1000
  const storage = await Promise.all(files.map(async (file) => {
    const [[metadata], [downloadUrl]] = await Promise.all([
      file.getMetadata(),
      file.getSignedUrl({ action: 'read', expires }),
    ])
    return {
      path: file.name,
      contentType: metadata.contentType ?? null,
      size: Number(metadata.size ?? 0),
      updatedAt: metadata.updated ?? null,
      downloadUrl,
      downloadUrlExpiresAt: new Date(expires).toISOString(),
    }
  }))

  return {
    format: 'rezolvo-account-export',
    version: 1,
    generatedAt: new Date().toISOString(),
    identity: {
      uid: decoded.uid,
      email: decoded.email ?? null,
      signInProvider: decoded.firebase?.sign_in_provider ?? null,
    },
    firestore: {
      account: root.exists ? exportValue(root.data()) : null,
      documents: docs.map((doc) => ({ path: doc.relativePath, data: exportValue(doc.data) })),
    },
    storage,
  }
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

    const attestation = req.headers['x-firebase-appcheck']
    const appChecked = await hasValidAppCheckToken(attestation)
    if (!appChecked && APP_CHECK_ENFORCED) {
      res.status(403).json({ error: 'App integrity check failed.' })
      return
    }
    if (!appChecked) logger.info(`[appcheck] unverified account request token=${attestation ? 'invalid' : 'missing'}`)

    let decoded: DecodedIdToken
    try {
      decoded = await getAuth().verifyIdToken(bearer[1])
    } catch {
      res.status(401).json({ error: 'Invalid or expired auth token' })
      return
    }
    if (!(await underRateLimit(`account_${decoded.uid}`, ACCOUNT_RATE_LIMIT))) {
      res.status(429).json({ error: 'Too many requests - please wait a moment.' })
      return
    }

    const isGuest = decoded.firebase?.sign_in_provider === 'anonymous'
    const deviceRaw = String(req.headers['x-rezolvo-device'] ?? '')
    const deviceId = /^[A-Za-z0-9_-]{8,64}$/.test(deviceRaw) ? deviceRaw : undefined

    try {
      if (req.path.endsWith('/migrate')) {
        if (!isGuest) {
          res.status(403).json({ error: 'Only guest sessions migrate' })
          return
        }
        const googleIdToken = (req.body as { googleIdToken?: unknown } | undefined)?.googleIdToken
        if (typeof googleIdToken !== 'string' || !googleIdToken) {
          res.status(400).json({ error: 'Missing googleIdToken' })
          return
        }

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
          if (payload.email) target = await getAuth().getUserByEmail(payload.email).catch(() => undefined)
        }
        if (!target) {
          res.status(404).json({ error: 'No existing account for this Google identity' })
          return
        }

        const migrated = target.uid === decoded.uid ? 0 : await migrateTree(decoded.uid, target.uid, deviceId)
        logger.info(`[account] migrated ${migrated} problem(s): ${decoded.uid} -> ${target.uid}`)
        res.json({ migrated })
        return
      }

      if (req.path.endsWith('/delete')) {
        if (!isGuest) {
          const authAge = Math.floor(Date.now() / 1000) - (decoded.auth_time ?? 0)
          if (authAge > MAX_AUTH_AGE_S) {
            res.status(401).json({ error: 'Recent sign-in required' })
            return
          }
        }
        await wipeUserData(decoded.uid, deviceId)
        logger.info(`[account] deleted account ${decoded.uid}`)
        res.json({ ok: true })
        return
      }

      if (req.path.endsWith('/export')) {
        const data = await buildAccountExport(decoded)
        res.set('Cache-Control', 'private, no-store')
        res.json(data)
        return
      }

      res.status(404).json({ error: 'Unknown operation' })
    } catch (error) {
      logger.error('[account] operation failed', error)
      res.status(500).json({ error: 'Account operation failed - please retry.' })
    }
  },
)
