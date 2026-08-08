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
  isDefinitiveOnboardingState,
  isDefinitiveProfileSnapshot,
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
  /** Loading is distinct from an empty profile: a cache miss must never send a
   * returning user through onboarding while Firestore is still checking the
   * server. */
  profileStatus: ProfileStatus
  profileError: Error | null
  retryProfile: () => void
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

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error'

const DEFAULT_BAC_TRACK: BacTrack = 'mate_info'
const PROFILE_LOAD_TIMEOUT_MS = 15_000
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
  const savingRef = useRef(false)
  const [profileSession, setProfileSession] = useState<{
    userId: string | null
    status: ProfileStatus
    error: Error | null
  }>({ userId: null, status: 'idle', error: null })
  const [reloadToken, setReloadToken] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    let active = true
    setProfile(EMPTY_LEARNING_PROFILE)
    profileRef.current = EMPTY_LEARNING_PROFILE
    profileExistsRef.current = false

    if (!user) {
      setProfileSession({ userId: null, status: 'idle', error: null })
      return
    }

    const userId = user.id
    let hasUsableProfile = false
    setProfileSession({ userId, status: 'loading', error: null })

    const failUnresolvedProfile = (reason: unknown) => {
      if (!active || hasUsableProfile) return
      const error = reason instanceof Error ? reason : new Error('Learning profile unavailable')
      profileRef.current = EMPTY_LEARNING_PROFILE
      profileExistsRef.current = false
      setProfile(EMPTY_LEARNING_PROFILE)
      setProfileSession({ userId, status: 'error', error })
    }

    const loadTimeout = setTimeout(() => {
      failUnresolvedProfile(new Error('Learning profile lookup timed out'))
    }, PROFILE_LOAD_TIMEOUT_MS)

    const unsubscribe = onSnapshot(
      learningProfileRef(userId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return

        // A missing *cached* document is not proof that this is a new user.
        // Firestore commonly emits this snapshot before the server response;
        // treating it as final causes returning users to flash onboarding.
        if (!isDefinitiveProfileSnapshot(snapshot.exists(), snapshot.metadata.fromCache)) return

        // Do not route on an optimistic local onboarding write. The explicit
        // persist path publishes the profile only after setDoc succeeds.
        if (snapshot.metadata.hasPendingWrites && savingRef.current) return

        let next: LearningProfile
        try {
          next = snapshot.exists()
            ? parseLearningProfile(snapshot.data())
            : EMPTY_LEARNING_PROFILE
        } catch (error) {
          // A malformed cached value may also be stale. Give the authoritative
          // server snapshot a chance to replace it before surfacing recovery.
          if (snapshot.metadata.fromCache) return
          clearTimeout(loadTimeout)
          // A corrupt or unsupported existing document is not a new account.
          // Surface recovery instead of sending the user through onboarding.
          reportNonFatal(error, 'learning-profile-parse')
          failUnresolvedProfile(error)
          return
        }
        // A cached incomplete document can lag behind completion on another
        // device. It must not flash onboarding before the server answers.
        if (!isDefinitiveOnboardingState(
          next.onboardingCompleted,
          snapshot.metadata.fromCache,
        )) return

        clearTimeout(loadTimeout)
        profileExistsRef.current = snapshot.exists()
        hasUsableProfile = true
        profileRef.current = next
        setProfile(next)
        setProfileSession({ userId, status: 'ready', error: null })
      },
      (error) => {
        if (!active) return
        clearTimeout(loadTimeout)
        reportNonFatal(error, 'learning-profile-subscribe')
        // Keep a valid cached/server profile usable if the live listener later
        // drops. If no trustworthy snapshot ever arrived, surface a retry UI;
        // never reinterpret a connectivity failure as unfinished onboarding.
        failUnresolvedProfile(error)
      },
    )

    return () => {
      active = false
      clearTimeout(loadTimeout)
      unsubscribe()
    }
  }, [reloadToken, user?.id])

  const retryProfile = useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  const persist = useCallback(async (next: LearningProfile) => {
    if (!user) throw new Error('Nu există o sesiune Firebase activă.')

    const previous = profileRef.current
    const previouslyExisted = profileExistsRef.current
    savingRef.current = true
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
      profileRef.current = next
      setProfile(next)
      setProfileSession({ userId: user.id, status: 'ready', error: null })
    } catch (error) {
      profileRef.current = previous
      profileExistsRef.current = previouslyExisted
      setProfile(previous)
      reportNonFatal(error, 'learning-profile-write')
      throw error
    } finally {
      savingRef.current = false
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
  // A state update from the previous account can be visible for one React
  // render while the new Firestore subscription is being established. Never
  // let the root treat that stale profile as hydrated for the new session.
  const profileStatus: ProfileStatus = !user
    ? 'idle'
    : profileSession.userId === user.id
      ? profileSession.status
      : 'loading'
  const profileError = profileSession.userId === user?.id ? profileSession.error : null
  const hydratedForActiveSession = !user || profileStatus === 'ready'

  const value = useMemo<ProductValue>(
    () => ({
      ...profile,
      hydrated: hydratedForActiveSession,
      profileStatus,
      profileError,
      retryProfile,
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
      hydratedForActiveSession,
      profile,
      profileError,
      profileStatus,
      retryProfile,
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
