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
import type { PracticeExam } from './catalog'
import { isBacTrack, type BacTrack } from '../product/profile'

export type PracticeAssistance = 'none' | 'hint' | 'ai' | 'solution'

export type PracticeAttemptAnswer = {
  exerciseId: string
  value: string
  correct: boolean
  assistance: PracticeAssistance
  /** Snapshot fields keep old attempts understandable if a catalog changes. */
  prompt?: string
  competency?: string
}

export type PracticeAttempt = {
  id: string
  setId: string
  /** Null means a topic chosen freely by a user without an exam objective. */
  exam: PracticeExam | null
  topic?: string
  profile?: BacTrack
  score: number
  total: number
  startedAt: number
  completedAt: number
  mode: 'practice' | 'simulation'
  elapsedSeconds: number
  answers: PracticeAttemptAnswer[]
}

function attemptsCol(uid: string) {
  return collection(doc(getFirestore(), 'users', uid), 'practiceAttempts')
}

function toMillis(value: unknown, fallback = Date.now()): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const toMillisFn = (value as { toMillis?: unknown }).toMillis
    if (typeof toMillisFn === 'function') return toMillisFn.call(value)
  }
  return fallback
}

/**
 * Writes the immutable attempt summary and every answer atomically. Answers
 * are documents instead of an opaque nested array, allowing Security Rules to
 * validate the value, correctness flag and assistance marker independently.
 */
export async function savePracticeAttempt(uid: string, attempt: PracticeAttempt): Promise<void> {
  const attemptRef = doc(attemptsCol(uid), attempt.id)
  const batch = writeBatch(getFirestore())
  const assistedCount = attempt.answers.filter((answer) => answer.assistance !== 'none').length

  batch.set(attemptRef, {
    schemaVersion: 1,
    setId: attempt.setId,
    exam: attempt.exam,
    topic: attempt.topic ?? null,
    profile: attempt.profile ?? null,
    score: attempt.score,
    total: attempt.total,
    startedAt: new Date(attempt.startedAt),
    completedAt: new Date(attempt.completedAt),
    mode: attempt.mode,
    elapsedSeconds: attempt.elapsedSeconds,
    responseCount: attempt.answers.length,
    assistedCount,
  })

  for (const answer of attempt.answers) {
    batch.set(doc(collection(attemptRef, 'responses'), answer.exerciseId), {
      value: answer.value,
      correct: answer.correct,
      assistance: answer.assistance,
      ...(answer.prompt ? { prompt: answer.prompt } : null),
      ...(answer.competency ? { competency: answer.competency } : null),
    })
  }

  await batch.commit()
}

export async function readPracticeAttempts(uid: string): Promise<PracticeAttempt[]> {
  const snapshot = await getDocs(query(attemptsCol(uid), orderBy('completedAt', 'desc'), limit(50)))

  return Promise.all(snapshot.docs.map(async (attemptDoc) => {
    const data = attemptDoc.data() as Record<string, unknown>
    const responseSnapshot = await getDocs(collection(attemptDoc.ref, 'responses'))
    const answers: PracticeAttemptAnswer[] = responseSnapshot.docs.map((responseDoc) => {
      const response = responseDoc.data() as Record<string, unknown>
      const assistance: PracticeAssistance = response.assistance === 'hint' || response.assistance === 'ai' || response.assistance === 'solution'
        ? response.assistance
        : 'none'
      return {
        exerciseId: responseDoc.id,
        value: typeof response.value === 'string' ? response.value : '',
        correct: response.correct === true,
        assistance,
        prompt: typeof response.prompt === 'string' ? response.prompt : undefined,
        competency: typeof response.competency === 'string' ? response.competency : undefined,
      }
    })

    return {
      id: attemptDoc.id,
      setId: typeof data.setId === 'string' ? data.setId : '',
      exam: data.exam === 'bac' ? 'bac' : data.exam === 'en' ? 'en' : null,
      topic: typeof data.topic === 'string' ? data.topic : undefined,
      profile: isBacTrack(data.profile) ? data.profile : undefined,
      score: typeof data.score === 'number' ? data.score : 0,
      total: typeof data.total === 'number' ? data.total : 0,
      startedAt: toMillis(data.startedAt),
      completedAt: toMillis(data.completedAt),
      mode: data.mode === 'simulation' ? 'simulation' : 'practice',
      elapsedSeconds: typeof data.elapsedSeconds === 'number' ? data.elapsedSeconds : 0,
      answers,
    }
  }))
}
