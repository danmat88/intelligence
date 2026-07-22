/**
 * Design tokens — the single source of truth for the whole app's look.
 * Direction: "porcelain, ink, signal." A cool near-white canvas, deep ink
 * surfaces and one electric-violet signal make every screen recognizable as
 * Rezolvo. Space Grotesk carries display/headers, Inter runs the UI, JetBrains
 * Mono does technical labels; Fraunces is reserved for mathematical notation.
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
const BRAND = ['#8B6CFF', '#5737F6']

export const theme: Theme = {
  colors: {
    bg: '#F4F5FA',
    bgElevated: '#FCFCFF',
    surface: '#FFFFFF',
    surfaceAlt: '#EAEBF2',
    border: 'rgba(21,18,31,0.09)',
    text: '#15121F',
    textMuted: '#656174',
    textFaint: '#9C98AA',
    accent: '#6847F5',
    accentSoft: '#EEE9FF',
    onAccent: '#FFFFFF',
    danger: '#E5484D',
    dangerSoft: '#FDECEE',
    success: '#078B61',
    successSoft: '#E2F6EE',
  },
  gradient: {
    brand: BRAND,
    surface: ['#FFFFFF', '#F2F0FA'],
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
