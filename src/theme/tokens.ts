/**
 * Design tokens — the single source of truth for the whole app's look.
 * Direction: "notebook, chalk, sticker." Warm exercise-book paper, navy ink,
 * tomato actions, school-bus yellow and chalk green keep the product playful
 * without sacrificing hierarchy or readability. Nunito runs the interface,
 * Fraunces carries mathematical reading, and JetBrains Mono labels evidence.
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
    /** Kalam — handwritten accent used only in the brand lockup. */
    handwritten: string
  }
}

export const theme: Theme = {
  colors: {
    bg: '#FFF8E7',
    bgElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F7EAC7',
    border: '#193149',
    text: '#193149',
    textMuted: '#587087',
    textFaint: '#8DA0B0',
    accent: '#E9543D',
    accentSoft: '#FFE1D8',
    onAccent: '#FFFFFF',
    sunny: '#FFC800',
    sunnySoft: '#FFF3BF',
    chalk: '#46A302',
    chalkDark: '#327A00',
    danger: '#EA2B2B',
    dangerSoft: '#FFE4E4',
    success: '#46A302',
    successSoft: '#E8F7D8',
    bubblyRed: '#FF4B4B',
    bubblyRedDark: '#C92B2B',
    bubblyGreen: '#58CC02',
    bubblyGreenDark: '#3D9200',
    bubblyBlue: '#1CB0F6',
    bubblyBlueDark: '#147EAF',
    bubblyYellow: '#FFC800',
    bubblyYellowDark: '#C89400',
    cardEdge: '#193149',
  },
  gradient: {
    brand: ['#F06A4D', '#E9543D'],
    surface: ['#FFFFFF', '#FFF8E7'],
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
    handwritten: 'Kalam_700Bold',
  },
}
