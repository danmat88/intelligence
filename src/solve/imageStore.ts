import { getApp } from '@react-native-firebase/app'
import { getAuth, getIdToken } from '@react-native-firebase/auth'

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

/** Best-effort cleanup when a problem is deleted — never blocks anything. */
export function deleteProblemImages(paths: (string | undefined)[]): void {
  const b = bucket()
  for (const p of paths) {
    if (!p) continue
    authHeader()
      .then((auth) =>
        fetch(`${HOST}/${b}/o/${encodeURIComponent(p)}`, { method: 'DELETE', headers: { Authorization: auth } }),
      )
      .catch(() => {})
  }
}
