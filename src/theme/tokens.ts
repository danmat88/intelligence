/**
 * Design tokens — the single source of truth for the whole app's look.
 * One light theme only: clean white surfaces, hairline borders, and a single
 * refined violet accent used sparingly. Premium through restraint.
 */

export type Theme = {
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
}

// The one signature gradient — a restrained two-stop violet→blue.
const BRAND = ['#7C6CFF', '#4F8DFF']

export const theme: Theme = {
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
  },
  radius: { sm: 12, md: 16, lg: 22, xl: 30, pill: 999 },
  space: (n: number) => n * 4,
  font: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
    display: 'SpaceGrotesk_700Bold',
    displayMedium: 'SpaceGrotesk_500Medium',
  },
}
