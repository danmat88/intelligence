import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/ThemeProvider'

/**
 * The signature brand gradient (violet → indigo → cyan at 45°) as a container.
 * Every gradient badge/mark/button in the app renders through this, so the
 * palette and angle live in exactly one place (plus the theme tokens).
 */
export default function BrandGradient({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  const { theme } = useTheme()
  return (
    <LinearGradient
      colors={theme.gradient.brand as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  )
}
