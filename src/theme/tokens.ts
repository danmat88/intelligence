/**
 * Design tokens — the single source of truth for the whole app's look.
 * Direction: "electric on warm paper." A warm near-white ground, one vivid
 * blurple accent with a violet→indigo gradient for brand moments, indigo-ink
 * text. Space Grotesk carries display/headers, Inter runs the UI, JetBrains
 * Mono does the technical labels; Fraunces survives only for math GLYPHS
 * (the ∫ watermark) where a serif italic reads as notation, not nostalgia.
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
    accentSoft: string
    onAccent: string
    danger: string
    dangerSoft: string
    success: string
    successSoft: string
  }
  /** Multi-stop gradients (arrays of colour stops). */
  gradient: {
    brand: string[]
    surface: string[]
  }
  radius: { sm: number; md: number; lg: number; xl: number; pill: number }
  /** 4px base spacing scale: space(4) = 16. */
  space: (n: number) => number
  /** Font families (Inter loaded in App; serif is the platform serif). */
  font: {
    regular: string
    medium: string
    semibold: string
    bold: string
    extrabold: string
    /** Display face for brand moments (Space Grotesk). */
    display: string
    displayMedium: string
    /** Fraunces — characterful serif for headers and the typeset feel. */
    serif: string
    serifItalic: string
    /** JetBrains Mono — labels, step numbers, technical bits. */
    mono: string
  }
}

// The one signature accent — electric blurple; the gradient runs violet → indigo.
const BRAND = ['#7A5CFF', '#4F33EA']

export const theme: Theme = {
  colors: {
    bg: '#F7F6F2',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE7',
    border: 'rgba(26,22,38,0.10)',
    text: '#1A1626',
    textMuted: '#5D5870',
    textFaint: '#9B96AB',
    accent: '#6355FF',
    accentSoft: '#EDEAFF',
    onAccent: '#FFFFFF',
    danger: '#E5484D',
    dangerSoft: '#FCEBEC',
    success: '#0E9F6E',
    successSoft: '#E3F6EE',
  },
  gradient: {
    brand: BRAND,
    surface: ['#FFFFFF', '#F4F2EC'],
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
    serif: 'Fraunces_600SemiBold',
    serifItalic: 'Fraunces_600SemiBold_Italic',
    mono: 'JetBrainsMono_500Medium',
  },
}
