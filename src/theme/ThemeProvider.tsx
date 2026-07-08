import { createContext, useContext, type ReactNode } from 'react'
import { theme, type Theme } from './tokens'

/** Single light theme - no modes, no toggles, one coherent look. */
type ThemeContextValue = { theme: Theme }

const ThemeContext = createContext<ThemeContextValue>({ theme })

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
