import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ArchiveExam } from './catalog'

export type OfficialPaperMode = 'study' | 'guided' | 'simulation'

export type OfficialPaperAttempt = {
  id: string
  packageId: string
  exam: ArchiveExam
  year: number
  session: string
  profile?: string
  mode: OfficialPaperMode
  startedAt: number
  completedAt?: number
  elapsedSeconds: number
  /** Work is stored per exercise so the pupil resumes at the exact item. */
  answers?: Record<string, string>
  exerciseIndex?: number
  helpUsed?: string[]
  /** Deterministically calculated score where the content model permits it. */
  score?: number
  maxScore?: number
  /** Legacy fields kept optional so existing local attempts migrate safely. */
  work?: string
  page?: number
}

const STORAGE_KEY = '@profu.official.attempts'

export async function readOfficialAttempts(): Promise<OfficialPaperAttempt[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

export async function saveOfficialAttempt(attempt: OfficialPaperAttempt): Promise<void> {
  const current = await readOfficialAttempts()
  const withoutSame = current.filter((item) => item.id !== attempt.id)
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([attempt, ...withoutSame].slice(0, 50)),
  )
}

export async function findOpenOfficialAttempt(
  packageId: string,
  profile?: string,
  mode?: OfficialPaperMode,
): Promise<OfficialPaperAttempt | null> {
  const attempts = await readOfficialAttempts()
  return attempts.find(
    (attempt) =>
      attempt.packageId === packageId &&
      attempt.profile === profile &&
      (!mode || attempt.mode === mode) &&
      !attempt.completedAt,
  ) ?? null
}
