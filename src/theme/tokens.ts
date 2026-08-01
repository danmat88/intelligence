/**
 * Design tokens — the single source of truth for the whole app's look.
 * Direction: "notebook, chalk, sticker." Warm exercise-book paper, navy ink,
 * tomato actions, school-bus yellow and chalk green make Profu' de Mate feel
 * like an animated classroom. Space Grotesk carries display/headers, Inter
 * runs the UI, JetBrains Mono does labels and Fraunces carries math character.
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
    sunny: string
    sunnySoft: string
    chalk: string
    chalkDark: string
    danger: string
    dangerSoft: string
    success: string
    successSoft: string
    bubblyRed: string
    bubblyRedDark: string
    bubblyGreen: string
    bubblyGreenDark: string
    bubblyBlue: string
    bubblyBlueDark: string
    bubblyYellow: string
    bubblyYellowDark: string
    cardEdge: string
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

const BRAND = ['#F06A4D', '#E84B3A']

export const theme: Theme = {
  colors: {
    bg: '#F0F8FF',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#E1F5FE',
    border: '#0A1C2E',
    text: '#0A1C2E',
    textMuted: '#4F7FA8',
    textFaint: '#8DA9C4',
    accent: '#FF5722',
    accentSoft: '#FFCCBC',
    onAccent: '#FFFFFF',
    sunny: '#FFC107',
    sunnySoft: '#FFF8E1',
    chalk: '#4CAF50',
    chalkDark: '#388E3C',
    danger: '#F44336',
    dangerSoft: '#FFEBEE',
    success: '#4CAF50',
    successSoft: '#E8F5E9',
    bubblyRed: '#FF5252',
    bubblyRedDark: '#D32F2F',
    bubblyGreen: '#4CAF50',
    bubblyGreenDark: '#388E3C',
    bubblyBlue: '#03A9F4',
    bubblyBlueDark: '#0288D1',
    bubblyYellow: '#FFC107',
    bubblyYellowDark: '#FFA000',
    cardEdge: '#0A1C2E',
  },
  gradient: {
    brand: ['#FF9800', '#FF5722'],
    surface: ['#FFFFFF', '#E1F5FE'],
  },
  radius: { sm: 16, md: 24, lg: 32, xl: 40, pill: 999 },
  space: (n: number) => n * 4,
  font: {
    regular: 'Nunito_600SemiBold',
    medium: 'Nunito_700Bold',
    semibold: 'Nunito_800ExtraBold',
    bold: 'Nunito_800ExtraBold',
    extrabold: 'Nunito_900Black',
    display: 'Nunito_900Black',
    displayMedium: 'Nunito_800ExtraBold',
    serif: 'Fraunces_600SemiBold',
    serifItalic: 'Fraunces_600SemiBold_Italic',
    mono: 'JetBrainsMono_500Medium',
  },
}
