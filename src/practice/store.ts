import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PracticeExam } from './catalog'

export type PracticeAttempt = {
  id: string
  setId: string
  exam: PracticeExam
  score: number
  total: number
  completedAt: number
  mode?: 'practice' | 'simulation'
  elapsedSeconds?: number
  answers: Array<{
    exerciseId: string
    value: string
    correct: boolean
  }>
}

const STORAGE_KEY = '@profu.practice.attempts'

export async function savePracticeAttempt(attempt: PracticeAttempt): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  const current: PracticeAttempt[] = raw ? JSON.parse(raw) : []
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([attempt, ...current].slice(0, 50)))
}

export async function readPracticeAttempts(): Promise<PracticeAttempt[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  const value = JSON.parse(raw)
  if (!Array.isArray(value)) return []
  return value.map((attempt) => ({
    ...attempt,
    answers: Array.isArray(attempt.answers) ? attempt.answers : [],
  }))
}
