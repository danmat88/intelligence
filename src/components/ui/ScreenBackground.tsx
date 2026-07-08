import { View, type ViewProps } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

/**
 * Full-screen backdrop: a clean, flat base. Depth comes from surface layers
 * and hairline borders, not from painted-on glow - the big-tech dark look.
 */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()
  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]} {...rest}>
      {children}
    </View>
  )
}
