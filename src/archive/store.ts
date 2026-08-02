import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  writeBatch,
} from '@react-native-firebase/firestore'
import type { ArchiveExam } from './catalog'
import { isBacTrack, type BacTrack } from '../product/profile'

export type OfficialPaperMode = 'study' | 'guided' | 'simulation'
export type OfficialAssistance = 'none' | 'hint' | 'ai' | 'solution'

export type OfficialPaperAttempt = {
  id: string
  packageId: string
  exam: ArchiveExam
  year: number
  session: string
  profile?: BacTrack
  mode: OfficialPaperMode
  startedAt: number
  completedAt?: number
  elapsedSeconds: number
  answers: Record<string, string>
  exerciseIndex: number
  assistance: Record<string, OfficialAssistance>
  score?: number
  maxScore?: number
}

function attemptsCol(uid: string) {
  return collection(doc(getFirestore(), 'users', uid), 'paperAttempts')
}

function toMillis(value: unknown, fallback = Date.now()): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillisFn = (value as { toMillis?: unknown }).toMillis
    if (typeof toMillisFn === 'function') return toMillisFn.call(value)
  }
  return fallback
}

export async function readOfficialAttempts(uid: string): Promise<OfficialPaperAttempt[]> {
  const snapshot = await getDocs(query(attemptsCol(uid), orderBy('startedAt', 'desc'), limit(50)))

  return Promise.all(snapshot.docs.map(async (attemptDoc) => {
    const data = attemptDoc.data() as Record<string, unknown>
    const responseSnapshot = await getDocs(collection(attemptDoc.ref, 'responses'))
    const answers: Record<string, string> = {}
    const assistance: Record<string, OfficialAssistance> = {}

    for (const responseDoc of responseSnapshot.docs) {
      const response = responseDoc.data() as Record<string, unknown>
      answers[responseDoc.id] = typeof response.value === 'string' ? response.value : ''
      assistance[responseDoc.id] =
        response.assistance === 'hint' || response.assistance === 'ai' || response.assistance === 'solution'
          ? response.assistance
          : 'none'
    }

    const completedAt = data.completedAt == null ? undefined : toMillis(data.completedAt)
    return {
      id: attemptDoc.id,
      packageId: typeof data.packageId === 'string' ? data.packageId : '',
      exam: data.exam === 'bac' ? 'bac' : 'en',
      year: typeof data.year === 'number' ? data.year : 0,
      session: typeof data.session === 'string' ? data.session : '',
      profile: isBacTrack(data.profile) ? data.profile : undefined,
      mode: data.mode === 'study' || data.mode === 'simulation' ? data.mode : 'guided',
      startedAt: toMillis(data.startedAt),
      completedAt,
      elapsedSeconds: typeof data.elapsedSeconds === 'number' ? data.elapsedSeconds : 0,
      answers,
      exerciseIndex: typeof data.exerciseIndex === 'number' ? data.exerciseIndex : 0,
      assistance,
      score: typeof data.score === 'number' ? data.score : undefined,
      maxScore: typeof data.maxScore === 'number' ? data.maxScore : undefined,
    }
  }))
}

export async function saveOfficialAttempt(uid: string, attempt: OfficialPaperAttempt): Promise<void> {
  const attemptRef = doc(attemptsCol(uid), attempt.id)
  const batch = writeBatch(getFirestore())
  const assistedCount = Object.values(attempt.assistance)
    .filter((value) => value !== 'none').length

  batch.set(attemptRef, {
    schemaVersion: 1,
    packageId: attempt.packageId,
    exam: attempt.exam,
    year: attempt.year,
    session: attempt.session,
    profile: attempt.profile ?? null,
    mode: attempt.mode,
    startedAt: new Date(attempt.startedAt),
    completedAt: attempt.completedAt ? new Date(attempt.completedAt) : null,
    elapsedSeconds: attempt.elapsedSeconds,
    exerciseIndex: attempt.exerciseIndex,
    responseCount: Object.keys(attempt.answers).length,
    assistedCount,
    score: attempt.score ?? null,
    maxScore: attempt.maxScore ?? null,
  })

  for (const [exerciseId, value] of Object.entries(attempt.answers)) {
    batch.set(doc(collection(attemptRef, 'responses'), exerciseId), {
      value,
      assistance: attempt.assistance[exerciseId] ?? 'none',
    })
  }

  await batch.commit()
}

export async function findOpenOfficialAttempt(
  uid: string,
  packageId: string,
  profile?: BacTrack,
  mode?: OfficialPaperMode,
): Promise<OfficialPaperAttempt | null> {
  const attempts = await readOfficialAttempts(uid)
  return attempts.find(
    (attempt) =>
      attempt.packageId === packageId &&
      attempt.profile === profile &&
      (!mode || attempt.mode === mode) &&
      !attempt.completedAt,
  ) ?? null
}
