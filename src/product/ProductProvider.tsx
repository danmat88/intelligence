import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthProvider'
import { reportNonFatal } from '../lib/report'
import {
  BAC_TRACK_LABELS,
  EMPTY_LEARNING_PROFILE,
  makeCompletedProfile,
  parseLearningProfile,
  type BacTrack,
  type ExamGoal,
  type LearningProfile,
} from './profile'

/** Temporary view model used by the existing screens while navigation is
 * rebuilt. `general` is never persisted; it means a completed profile whose
 * optional examGoal is null. */
export type LearningGoal = 'en' | 'bac' | 'general' | null
export type BacProfile = (typeof BAC_TRACK_LABELS)[BacTrack]

type ProductValue = LearningProfile & {
  hydrated: boolean
  saving: boolean
  /** Compatibility projection. Do not persist this value. */
  goal: LearningGoal
  /** Human-readable compatibility projection for existing screens. */
  bacProfile: BacProfile
  completeOnboarding: (examGoal: ExamGoal, bacTrack?: BacTrack | null) => Promise<void>
  setExamGoal: (examGoal: ExamGoal, bacTrack?: BacTrack | null) => Promise<void>
  setGoal: (goal: Exclude<LearningGoal, null>) => Promise<void>
  setBacProfile: (profile: BacProfile) => Promise<void>
}

const DEFAULT_BAC_TRACK: BacTrack = 'mate_info'
const ProductContext = createContext<ProductValue | null>(null)

function learningProfileRef(uid: string) {
  const userRef = doc(getFirestore(), 'users', uid)
  return doc(collection(userRef, 'profile'), 'learning')
}

function trackFromLabel(label: BacProfile): BacTrack {
  const found = (Object.entries(BAC_TRACK_LABELS) as Array<[BacTrack, BacProfile]>)
    .find(([, value]) => value === label)
  return found?.[0] ?? DEFAULT_BAC_TRACK
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<LearningProfile>(EMPTY_LEARNING_PROFILE)
  const profileRef = useRef(profile)
  const profileExistsRef = useRef(false)
  const [hydrated, setHydrated] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    setHydrated(false)
    setProfile(EMPTY_LEARNING_PROFILE)
    profileRef.current = EMPTY_LEARNING_PROFILE
    profileExistsRef.current = false

    if (!user) {
      setHydrated(true)
      return
    }

    return onSnapshot(
      learningProfileRef(user.id),
      (snapshot) => {
        profileExistsRef.current = snapshot.exists()
        const next = snapshot.exists()
          ? parseLearningProfile(snapshot.data())
          : EMPTY_LEARNING_PROFILE
        profileRef.current = next
        setProfile(next)
        setHydrated(true)
      },
      (error) => {
        reportNonFatal(error, 'learning-profile-subscribe')
        // An unavailable remote profile must never reveal another account's
        // state. The safe fallback is an unfinished, empty profile.
        profileRef.current = EMPTY_LEARNING_PROFILE
        profileExistsRef.current = false
        setProfile(EMPTY_LEARNING_PROFILE)
        setHydrated(true)
      },
    )
  }, [user?.id])

  const persist = useCallback(async (next: LearningProfile) => {
    if (!user) throw new Error('Nu există o sesiune Firebase activă.')

    const previous = profileRef.current
    const previouslyExisted = profileExistsRef.current
    profileRef.current = next
    setProfile(next)
    setSaving(true)
    try {
      await setDoc(
        learningProfileRef(user.id),
        {
          ...next,
          updatedAt: serverTimestamp(),
          ...(!previouslyExisted ? { createdAt: serverTimestamp() } : null),
        },
        { merge: true },
      )
      profileExistsRef.current = true
    } catch (error) {
      profileRef.current = previous
      profileExistsRef.current = previouslyExisted
      setProfile(previous)
      reportNonFatal(error, 'learning-profile-write')
      throw error
    } finally {
      setSaving(false)
    }
  }, [user?.id])

  const completeOnboarding = useCallback(
    (examGoal: ExamGoal, bacTrack: BacTrack | null = null) =>
      persist(makeCompletedProfile(examGoal, bacTrack)),
    [persist],
  )

  const setExamGoal = useCallback(
    (examGoal: ExamGoal, bacTrack: BacTrack | null = null) =>
      persist(makeCompletedProfile(examGoal, bacTrack)),
    [persist],
  )

  const setGoal = useCallback(
    (goal: Exclude<LearningGoal, null>) => {
      if (goal === 'general') return setExamGoal(null)
      if (goal === 'en') return setExamGoal('en')
      return setExamGoal('bac', profileRef.current.bacTrack ?? DEFAULT_BAC_TRACK)
    },
    [setExamGoal],
  )

  const setBacProfile = useCallback(
    (label: BacProfile) => setExamGoal('bac', trackFromLabel(label)),
    [setExamGoal],
  )

  const goal: LearningGoal = !profile.onboardingCompleted
    ? null
    : profile.examGoal ?? 'general'
  const bacProfile = BAC_TRACK_LABELS[profile.bacTrack ?? DEFAULT_BAC_TRACK]

  const value = useMemo<ProductValue>(
    () => ({
      ...profile,
      hydrated,
      saving,
      goal,
      bacProfile,
      completeOnboarding,
      setExamGoal,
      setGoal,
      setBacProfile,
    }),
    [
      bacProfile,
      completeOnboarding,
      goal,
      hydrated,
      profile,
      saving,
      setBacProfile,
      setExamGoal,
      setGoal,
    ],
  )

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

export function useProduct() {
  const value = useContext(ProductContext)
  if (!value) throw new Error('useProduct trebuie folosit în ProductProvider')
  return value
}
