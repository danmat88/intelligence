import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

type CardTone = 'white' | 'chalk' | 'yellow' | 'blue' | 'red' | 'soft'

type Props = {
  tone?: CardTone
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

export default function Card({ tone = 'white', style, children }: Props) {
  const { theme } = useTheme()
  const c = theme.colors

  const getColors = () => {
    switch (tone) {
      case 'chalk':
        return { bg: c.chalkDark, border: '#0A2926', edge: '#071F1D' }
      case 'yellow':
        return { bg: c.bubblyYellow, border: c.bubblyYellowDark, edge: c.bubblyYellowDark }
      case 'blue':
        return { bg: c.bubblyBlue, border: c.bubblyBlueDark, edge: c.bubblyBlueDark }
      case 'red':
        return { bg: c.bubblyRed, border: c.bubblyRedDark, edge: c.bubblyRedDark }
      case 'soft':
        return { bg: c.sunnySoft, border: '#E5C470', edge: '#D6B35E' }
      case 'white':
      default:
        return { bg: c.surface, border: c.cardEdge, edge: '#D0D0D0' }
    }
  }

  const { bg, border, edge } = getColors()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: border,
          borderBottomColor: edge,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 4.5,
    padding: 16,
  },
})
