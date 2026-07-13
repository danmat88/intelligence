import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from '@react-native-firebase/firestore'

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

export async function createProblem(
  uid: string,
  title: string,
  topic: string | null,
  turns: StoredTurn[],
  opts?: {
    photo?: boolean
    /** Restore with the ORIGINAL date (undo after delete) instead of "now" —
     *  otherwise last week's problem resurrects under "Today" and fakes the streak. */
    createdAt?: number
  },
): Promise<string> {
  const ref = await addDoc(problemsCol(uid), {
    title,
    topic,
    turns,
    photo: opts?.photo ?? false,
    createdAt: opts?.createdAt ? new Date(opts.createdAt) : serverTimestamp(),
  })
  return ref.id
}

/** Update the saved problem. Title/topic ride along because the doc is often
 *  CREATED before the solution exists (photo upload finishing first races the
 *  solve) — the placeholder title and null topic must heal on the next save. */
export async function updateProblemTurns(
  uid: string,
  id: string,
  turns: StoredTurn[],
  title?: string,
  topic?: string | null,
): Promise<void> {
  await updateDoc(doc(problemsCol(uid), id), {
    turns,
    ...(title ? { title } : null),
    ...(topic !== undefined ? { topic } : null),
  })
}

export async function removeProblem(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(problemsCol(uid), id))
}

/** One-shot read of a user's problems. Used to CARRY A GUEST'S WORK OVER when
 *  their Google account already exists: linking is impossible there, so we
 *  must read the guest's tree while still signed in as the guest, then write
 *  it into the account we switch to. */
export async function fetchAllProblems(uid: string): Promise<Problem[]> {
  const snap = await getDocs(query(problemsCol(uid), orderBy('createdAt', 'desc'), limit(60)))
  return snap.docs.map((d) => {
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
  })
}

/** Copy problems into `uid`, preserving their original dates. Best-effort:
 *  a failed copy must never block the sign-in that triggered it. */
export async function copyProblemsInto(uid: string, items: Problem[]): Promise<number> {
  let copied = 0
  for (const p of items) {
    try {
      await createProblem(uid, p.title, p.topic, p.turns, { photo: p.photo, createdAt: p.createdAt })
      copied++
    } catch {
      // skip this one — the rest still make it
    }
  }
  return copied
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
      cb([])
    },
  )
}
