import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { themes, type Theme, type ThemeMode } from './tokens'

/**
 * Theme context. By default the app follows the phone's system setting; the
 * user can override it with the toggle (which then sticks until they clear it).
 */
type ThemeContextValue = {
  theme: Theme
  mode: ThemeMode
  /** true when we're tracking the OS setting (no manual override). */
  followingSystem: boolean
  setMode: (mode: ThemeMode) => void
  toggle: () => void
  useSystem: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() // 'dark' | 'light' | null
  const [override, setOverride] = useState<ThemeMode | null>(null)

  const mode: ThemeMode = override ?? (system === 'light' ? 'light' : 'dark')

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themes[mode],
      mode,
      followingSystem: override === null,
      setMode: setOverride,
      toggle: () => setOverride(mode === 'dark' ? 'light' : 'dark'),
      useSystem: () => setOverride(null),
    }),
    [mode, override],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
