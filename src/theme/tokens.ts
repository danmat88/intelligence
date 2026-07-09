/**
 * Design tokens — the single source of truth for the whole app's look.
 * Direction: "ink on paper." A cool paper ground (not stark white), a single
 * fountain-pen-ink blue accent, graphite text, and math typeset like a textbook.
 * A serif display face carries the academic moments; Inter runs the UI.
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

// The one signature accent — fountain-pen ink blue, deepened slightly for the gradient.
const BRAND = ['#2B50E0', '#2440C6']

export const theme: Theme = {
  colors: {
    bg: '#F5F7FB',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF0F7',
    border: 'rgba(20,25,34,0.10)',
    text: '#141922',
    textMuted: '#5A6472',
    textFaint: '#97A1B0',
    accent: '#2B50E0',
    accentSoft: '#EAEFFF',
    onAccent: '#FFFFFF',
    danger: '#E0364C',
    success: '#0E9F6E',
    successSoft: '#E3F6EE',
  },
  gradient: {
    brand: BRAND,
    surface: ['#FFFFFF', '#F1F4FA'],
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
