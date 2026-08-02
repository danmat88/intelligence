export const LEARNING_PROFILE_SCHEMA_VERSION = 1 as const

export type ExamGoal = 'en' | 'bac' | null

export const BAC_TRACKS = [
  'mate_info',
  'stiinte_naturii',
  'tehnologic',
  'pedagogic',
] as const

export type BacTrack = (typeof BAC_TRACKS)[number]

export type LearningProfile = {
  schemaVersion: typeof LEARNING_PROFILE_SCHEMA_VERSION
  onboardingCompleted: boolean
  examGoal: ExamGoal
  bacTrack: BacTrack | null
}

export const EMPTY_LEARNING_PROFILE: LearningProfile = {
  schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
  onboardingCompleted: false,
  examGoal: null,
  bacTrack: null,
}

export const BAC_TRACK_LABELS: Record<BacTrack, string> = {
  mate_info: 'Matematică-informatică',
  stiinte_naturii: 'Științe ale naturii',
  tehnologic: 'Tehnologic',
  pedagogic: 'Pedagogic',
}

export function isBacTrack(value: unknown): value is BacTrack {
  return typeof value === 'string' && (BAC_TRACKS as readonly string[]).includes(value)
}

export function parseLearningProfile(value: unknown): LearningProfile {
  if (!value || typeof value !== 'object') return EMPTY_LEARNING_PROFILE

  const candidate = value as Partial<LearningProfile>
  if (
    candidate.schemaVersion !== LEARNING_PROFILE_SCHEMA_VERSION ||
    typeof candidate.onboardingCompleted !== 'boolean' ||
    (candidate.examGoal !== null && candidate.examGoal !== 'en' && candidate.examGoal !== 'bac')
  ) return EMPTY_LEARNING_PROFILE

  const examGoal: ExamGoal = candidate.examGoal
  if (examGoal === 'bac' && !isBacTrack(candidate.bacTrack)) return EMPTY_LEARNING_PROFILE
  const bacTrack = examGoal === 'bac' && isBacTrack(candidate.bacTrack)
    ? candidate.bacTrack
    : null

  return {
    schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
    onboardingCompleted: candidate.onboardingCompleted,
    examGoal,
    bacTrack,
  }
}

export function makeCompletedProfile(
  examGoal: ExamGoal,
  bacTrack: BacTrack | null = null,
): LearningProfile {
  if (examGoal === 'bac' && !bacTrack) {
    throw new Error('Profilul BAC este obligatoriu.')
  }

  return {
    schemaVersion: LEARNING_PROFILE_SCHEMA_VERSION,
    onboardingCompleted: true,
    examGoal,
    bacTrack: examGoal === 'bac' ? bacTrack : null,
  }
}
