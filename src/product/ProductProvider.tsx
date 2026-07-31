import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type LearningGoal = 'en' | 'bac' | 'general' | null
export type BacProfile = 'Mate-info' | 'Științe ale naturii' | 'Tehnologic' | 'Pedagogic'

type StoredPreferences = {
  goal: LearningGoal
  bacProfile: BacProfile
}

type ProductValue = StoredPreferences & {
  hydrated: boolean
  setGoal: (goal: Exclude<LearningGoal, null>) => void
  setBacProfile: (profile: BacProfile) => void
}

const STORAGE_KEY = '@profu.product.preferences'
const DEFAULTS: StoredPreferences = {
  goal: null,
  bacProfile: 'Mate-info',
}

const ProductContext = createContext<ProductValue | null>(null)

export function ProductProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<StoredPreferences>(DEFAULTS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return
        const stored = JSON.parse(raw) as Partial<StoredPreferences>
        const goal: LearningGoal =
          stored.goal === 'en' || stored.goal === 'bac' || stored.goal === 'general'
            ? stored.goal
            : null
        const bacProfile: BacProfile =
          stored.bacProfile === 'Științe ale naturii' ||
          stored.bacProfile === 'Tehnologic' ||
          stored.bacProfile === 'Pedagogic'
            ? stored.bacProfile
            : 'Mate-info'
        setPreferences({ goal, bacProfile })
      })
      .catch(() => {})
      .finally(() => setHydrated(true))
  }, [])

  const update = useCallback((patch: Partial<StoredPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const setGoal = useCallback(
    (goal: Exclude<LearningGoal, null>) => update({ goal }),
    [update],
  )

  const setBacProfile = useCallback(
    (bacProfile: BacProfile) => update({ bacProfile }),
    [update],
  )

  const value = useMemo<ProductValue>(
    () => ({ ...preferences, hydrated, setGoal, setBacProfile }),
    [hydrated, preferences, setBacProfile, setGoal],
  )

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}

export function useProduct() {
  const value = useContext(ProductContext)
  if (!value) throw new Error('useProduct trebuie folosit în ProductProvider')
  return value
}
