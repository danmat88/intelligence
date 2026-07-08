/**
 * Design tokens — the single source of truth for the whole app's look.
 * Two themes (dark/light) share the same shape so every component can read
 * `useTheme()` and never hard-code a colour. Premium, gradient-forward,
 * Revolut-adjacent: deep surfaces, one vivid brand gradient, generous radii.
 */

export type ThemeMode = 'dark' | 'light'

export type Theme = {
  mode: ThemeMode
  colors: {
    bg: string
    bgElevated: string
    surface: string
    surfaceAlt: string
    border: string
    text: string
    textMuted: string
    textFaint: string
    accent: string
    onAccent: string
    danger: string
    success: string
  }
  /** Multi-stop gradients (arrays of colour stops). */
  gradient: {
    brand: string[]
    surface: string[]
    glow: string[]
  }
  radius: { sm: number; md: number; lg: number; xl: number; pill: number }
  /** 4px base spacing scale: space(4) = 16. */
  space: (n: number) => number
  /** Inter font families by weight (loaded in App). */
  font: {
    regular: string
    medium: string
    semibold: string
    bold: string
    extrabold: string
  }
  shadow: {
    color: string
    soft: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number }
  }
}

const radius = { sm: 12, md: 16, lg: 22, xl: 30, pill: 999 }
const space = (n: number) => n * 4

const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
}

// The one signature gradient, shared by both themes — violet → indigo → cyan.
const BRAND = ['#8B5CF6', '#6366F1', '#22D3EE']

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    bg: '#08080C',
    bgElevated: '#0E0E16',
    surface: '#14141F',
    surfaceAlt: '#1C1C2A',
    border: 'rgba(255,255,255,0.08)',
    text: '#F4F5FA',
    textMuted: '#A2A6B6',
    textFaint: '#6B6F82',
    accent: '#8B5CF6',
    onAccent: '#FFFFFF',
    danger: '#FF6B7A',
    success: '#34E5A3',
  },
  gradient: {
    brand: BRAND,
    surface: ['#14141F', '#0E0E16'],
    glow: ['rgba(139,92,246,0.34)', 'rgba(139,92,246,0)'],
  },
  radius,
  space,
  font: FONT,
  shadow: {
    color: '#000000',
    soft: { shadowColor: '#000000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  },
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    bg: '#F5F6FB',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F7',
    border: 'rgba(12,14,34,0.08)',
    text: '#0D0F1E',
    textMuted: '#565B70',
    textFaint: '#9296A8',
    accent: '#6D5CFF',
    onAccent: '#FFFFFF',
    danger: '#E23D53',
    success: '#12B886',
  },
  gradient: {
    brand: BRAND,
    surface: ['#FFFFFF', '#F1F2F9'],
    glow: ['rgba(109,92,255,0.20)', 'rgba(109,92,255,0)'],
  },
  radius,
  space,
  font: FONT,
  shadow: {
    color: '#5A5F80',
    soft: { shadowColor: '#3A3F63', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  },
}

export const themes: Record<ThemeMode, Theme> = { dark: darkTheme, light: lightTheme }
