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
        return { bg: c.chalk, border: c.border, edge: c.border }
      case 'yellow':
        return { bg: c.bubblyYellow, border: c.border, edge: c.border }
      case 'blue':
        return { bg: c.bubblyBlue, border: c.border, edge: c.border }
      case 'red':
        return { bg: c.bubblyRed, border: c.border, edge: c.border }
      case 'soft':
        return { bg: c.sunnySoft, border: c.border, edge: c.border }
      case 'white':
      default:
        return { bg: c.surface, border: c.border, edge: c.border }
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
    borderRadius: 26,
    borderWidth: 3,
    borderBottomWidth: 8,
    padding: 20,
  },
})
