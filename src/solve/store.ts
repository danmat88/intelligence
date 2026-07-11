import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from '@react-native-firebase/firestore'

/** A saved turn — text only. We never persist local photo URIs (cost + privacy). */
export type StoredTurn = { role: 'user' | 'assistant'; text: string }

export type Problem = {
  id: string
  title: string
  topic: string | null
  turns: StoredTurn[]
  createdAt: number
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

/** Drop runtime-only fields (image URIs, pending/error) before persisting. */
export function toStoredTurns(
  turns: { role: 'user' | 'assistant'; text: string; imageUri?: string }[],
  photoLabel = 'Photo problem',
): StoredTurn[] {
  return turns
    .filter((t) => !!t.text || !!t.imageUri)
    .map((t) => ({ role: t.role, text: t.text || photoLabel }))
}

export async function createProblem(
  uid: string,
  title: string,
  topic: string | null,
  turns: StoredTurn[],
): Promise<string> {
  const ref = await addDoc(problemsCol(uid), { title, topic, turns, createdAt: serverTimestamp() })
  return ref.id
}

export async function updateProblemTurns(uid: string, id: string, turns: StoredTurn[]): Promise<void> {
  await updateDoc(doc(problemsCol(uid), id), { turns })
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
            createdAt?: { toMillis?: () => number }
          }
          return {
            id: d.id,
            title: data.title ?? 'Problem',
            topic: data.topic ?? null,
            turns: Array.isArray(data.turns) ? data.turns : [],
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          }
        }),
      )
    },
    (err) => {
      // surface the real reason instead of silently showing an empty history
      console.warn('[history] snapshot error:', err?.message ?? err)
      cb([])
    },
  )
}
