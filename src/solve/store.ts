import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from '@react-native-firebase/firestore'
import { reportNonFatal } from '../lib/report'

/** A saved turn. Photos live in Firebase Storage (owner-only): `imagePath`
 *  is the storage object, `imageUrl` a tokened URL ready for <img src>;
 *  dimensions let the UI reserve the exact image box before it loads. */
export type StoredTurn = {
  role: 'user' | 'assistant'
  text: string
  imagePath?: string
  imageUrl?: string
  imageW?: number
  imageH?: number
}

export type Problem = {
  id: string
  title: string
  topic: string | null
  turns: StoredTurn[]
  createdAt: number
  /** True when the problem arrived as a photo (drives the history tile icon). */
  photo?: boolean
}

/**
 * Firestore persistence for solved problems: one doc per problem under
 * users/{uid}/problems, holding the short thread (problem + solution + any
 * follow-ups). The security rules already scope users/{uid}/** to the owner.
 *
 * Gotcha (CLAUDE.md): RNFirebase's modular collection() must be parented on a
 * DocumentReference, so the subcollection is built from doc(db,'users',uid).
 */
function problemsCol(uid: string) {
  return collection(doc(getFirestore(), 'users', uid), 'problems')
}

/** Drop runtime-only fields (local URIs, pending/error) before persisting;
 *  cloud image references (path + tokened URL) ride along when present. */
export function toStoredTurns(
  turns: {
    role: 'user' | 'assistant'
    text: string
    imageUri?: string
    imagePath?: string
    imageUrl?: string
    imageW?: number
    imageH?: number
  }[],
  photoLabel = 'Photo problem',
): StoredTurn[] {
  return turns
    .filter((t) => !!t.text || !!t.imageUri)
    .map((t) => ({
      role: t.role,
      text: t.text || photoLabel,
      ...(t.imagePath ? { imagePath: t.imagePath } : null),
      ...(t.imageUrl ? { imageUrl: t.imageUrl } : null),
      ...(t.imageW && t.imageH ? { imageW: t.imageW, imageH: t.imageH } : null),
    }))
}

/** Allocate a problem id WITHOUT writing anything. Persistence becomes
 *  idempotent by construction: the id is claimed synchronously, so parallel
 *  saves (photo upload landing vs the solve finishing) target the SAME doc
 *  instead of racing two creates into duplicates. */
export function newProblemId(uid: string): string {
  return doc(problemsCol(uid)).id
}

/** Idempotent save (setDoc merge) of the whole problem. Title/topic ride on
 *  every save because the doc is often first written before the solution
 *  exists — the placeholder title must heal on the next save. `createdAt` is
 *  written only when passed: 'now' on the doc's first save, a millis value on
 *  undo-restore (the ORIGINAL date — otherwise last week's problem resurrects
 *  under "Today" and fakes the streak). */
export async function writeProblem(
  uid: string,
  id: string,
  data: { title: string; topic: string | null; turns: StoredTurn[]; photo?: boolean },
  createdAt?: 'now' | number,
): Promise<void> {
  await setDoc(
    doc(problemsCol(uid), id),
    {
      title: data.title,
      topic: data.topic,
      turns: data.turns,
      ...(data.photo !== undefined ? { photo: data.photo } : null),
      ...(createdAt === 'now'
        ? { createdAt: serverTimestamp() }
        : typeof createdAt === 'number'
          ? { createdAt: new Date(createdAt) }
          : null),
    },
    { merge: true },
  )
}

export async function removeProblem(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(problemsCol(uid), id))
}

/** Live list of the user's problems, newest first. Returns an unsubscribe fn. */
export function subscribeProblems(uid: string, cb: (items: Problem[]) => void): () => void {
  const q = query(problemsCol(uid), orderBy('createdAt', 'desc'), limit(60))
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data() as {
            title?: string
            topic?: string | null
            turns?: StoredTurn[]
            photo?: boolean
            createdAt?: { toMillis?: () => number }
          }
          return {
            id: d.id,
            title: data.title ?? 'Problem',
            topic: data.topic ?? null,
            turns: Array.isArray(data.turns) ? data.turns : [],
            photo: data.photo,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          }
        }),
      )
    },
    (err) => {
      // surface the real reason instead of silently showing an empty history
      console.warn('[history] snapshot error:', err?.message ?? err)
      reportNonFatal(err, 'history-subscribe')
      cb([])
    },
  )
}
