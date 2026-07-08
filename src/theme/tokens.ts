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
  /** Font families (loaded in App): Inter for text, Space Grotesk for display. */
  font: {
    regular: string
    medium: string
    semibold: string
    bold: string
    extrabold: string
    /** Display face for brand moments: titles, greetings, the wordmark. */
    display: string
    displayMedium: string
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
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
}

// The one signature gradient, shared by both themes — a restrained two-stop
// violet→blue. One voice, used sparingly; everything else stays neutral.
const BRAND = ['#7C6CFF', '#4F8DFF']

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    bg: '#09090B',
    bgElevated: '#101014',
    surface: '#141419',
    surfaceAlt: '#1D1D24',
    border: 'rgba(255,255,255,0.07)',
    text: '#FAFAFC',
    textMuted: '#9FA1AD',
    textFaint: '#5F6170',
    accent: '#7C6CFF',
    onAccent: '#FFFFFF',
    danger: '#FF5C6E',
    success: '#2FD98F',
  },
  gradient: {
    brand: BRAND,
    surface: ['#141419', '#101014'],
    glow: ['rgba(124,108,255,0.10)', 'rgba(124,108,255,0)'],
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
    bg: '#FAFAFC',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F0F5',
    border: 'rgba(10,10,20,0.09)',
    text: '#111114',
    textMuted: '#5A5C68',
    textFaint: '#9AA0AC',
    accent: '#6B5AFF',
    onAccent: '#FFFFFF',
    danger: '#E0364C',
    success: '#0FA97A',
  },
  gradient: {
    brand: BRAND,
    surface: ['#FFFFFF', '#F3F3F8'],
    glow: ['rgba(107,90,255,0.08)', 'rgba(107,90,255,0)'],
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
