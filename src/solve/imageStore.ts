import { getApp } from '@react-native-firebase/app'
import { getAuth, getIdToken } from '@react-native-firebase/auth'
import * as FS from 'expo-file-system/legacy'

/**
 * Problem photos in Firebase Storage — the same wire protocol the official
 * web SDK speaks (v0 REST with a Firebase ID token), so no extra native
 * module and no rebuild. Owner-only access is enforced by storage.rules.
 *
 * Upload runs in PARALLEL with the solve (never blocks it); the resulting
 * {path,url} pair is persisted on the problem's stored turn. `url` carries a
 * download token, so plain <img src> works inside the thread document.
 */

export type StoredImage = { path: string; url: string }

const HOST = 'https://firebasestorage.googleapis.com/v0/b'

function bucket(): string {
  const b = getApp().options.storageBucket
  if (!b) throw new Error('no storage bucket configured')
  return b
}

async function authHeader(): Promise<string> {
  const u = getAuth().currentUser
  if (!u) throw new Error('not signed in')
  return `Firebase ${await getIdToken(u)}`
}

export async function uploadProblemImage(uid: string, id: string, fileUri: string): Promise<StoredImage> {
  const path = `users/${uid}/images/${id}.jpg`
  const b = bucket()
  // RN's fetch reads a local file:// URI into a Blob — binary-safe upload.
  const blob = await (await fetch(fileUri)).blob()
  const res = await fetch(`${HOST}/${b}/o?name=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { Authorization: await authHeader(), 'Content-Type': 'image/jpeg' },
    body: blob,
  })
  if (!res.ok) throw new Error(`image upload failed: ${res.status}`)
  const meta = (await res.json()) as { downloadTokens?: string }
  if (!meta.downloadTokens) throw new Error('image upload returned no token')
  // Problem photos are immutable (unique id) — mark them long-cacheable so
  // the WebView's disk cache serves them INSTANTLY on every later open
  // (Storage's default is max-age=0, which forces a refetch every time).
  fetch(`${HOST}/${b}/o/${encodeURIComponent(path)}`, {
    method: 'PATCH',
    headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ cacheControl: 'public, max-age=31536000, immutable' }),
  }).catch(() => {})
  const url = `${HOST}/${b}/o/${encodeURIComponent(path)}?alt=media&token=${meta.downloadTokens}`
  return { path, url }
}

/**
 * LOCAL-FIRST display (the WhatsApp model): the photo was born on this
 * device — showing it must never touch the network. A permanent local copy
 * is written at solve time; history opens resolve to it instantly. The
 * cloud copy exists for other devices/reinstalls, and a background download
 * backfills the local copy the first time it's ever needed remotely.
 */
const LOCAL_DIR = FS.documentDirectory + 'problem-images/'

/** Local file for a storage object — keyed by the storage filename, which is
 *  stable across loads (turn ids regenerate, imagePath does not). */
function localPathFor(imagePath: string): string {
  return LOCAL_DIR + imagePath.split('/').pop()
}

/** Permanent on-device copy at solve time (the capture lives in purgeable cache). */
export async function saveLocalCopy(turnId: string, fileUri: string): Promise<void> {
  await FS.makeDirectoryAsync(LOCAL_DIR, { intermediates: true }).catch(() => {})
  await FS.copyAsync({ from: fileUri, to: `${LOCAL_DIR}${turnId}.jpg` })
}

/** The URI history should DISPLAY: local file instantly when it exists;
 *  otherwise the cloud URL now + a silent local backfill for next time. */
export async function resolveImageUri(imagePath?: string, imageUrl?: string): Promise<string | undefined> {
  if (imagePath) {
    const lp = localPathFor(imagePath)
    try {
      const info = await FS.getInfoAsync(lp)
      if (info.exists) return lp
      if (imageUrl) FS.downloadAsync(imageUrl, lp).catch(() => {})
    } catch {
      // disk hiccup — fall through to the cloud URL
    }
  }
  return imageUrl
}

/** Best-effort cleanup (cloud + local) when a problem is deleted. */
export function deleteProblemImages(paths: (string | undefined)[]): void {
  const b = bucket()
  for (const p of paths) {
    if (!p) continue
    FS.deleteAsync(localPathFor(p), { idempotent: true }).catch(() => {})
    authHeader()
      .then((auth) =>
        fetch(`${HOST}/${b}/o/${encodeURIComponent(p)}`, { method: 'DELETE', headers: { Authorization: auth } }),
      )
      .catch(() => {})
  }
}
