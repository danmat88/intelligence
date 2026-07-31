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
    bg: '#FFF8E7',
    bgElevated: '#FFFCF4',
    surface: '#FFFEF8',
    surfaceAlt: '#F7EAC7',
    border: 'rgba(25,49,73,0.35)',
    text: '#193149',
    textMuted: '#5F6D72',
    textFaint: '#6F7B76',
    accent: '#E9543D',
    accentSoft: '#FFE0D4',
    onAccent: '#FFFFFF',
    sunny: '#F6C953',
    sunnySoft: '#FFF0B8',
    chalk: '#197565',
    chalkDark: '#103F3B',
    danger: '#D63C39',
    dangerSoft: '#FDE5DE',
    success: '#58CC02',
    successSoft: '#DDF3E6',
    bubblyRed: '#FF4B4B',
    bubblyRedDark: '#EA2B2B',
    bubblyGreen: '#58CC02',
    bubblyGreenDark: '#46A302',
    bubblyBlue: '#1CB0F6',
    bubblyBlueDark: '#1899D6',
    bubblyYellow: '#FFC800',
    bubblyYellowDark: '#E5B200',
    cardEdge: '#E5E5E5',
  },
  gradient: {
    brand: BRAND,
    surface: ['#FFFEF8', '#FFF1C8'],
  },
  radius: { sm: 12, md: 17, lg: 23, xl: 30, pill: 999 },
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
