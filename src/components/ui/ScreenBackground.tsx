import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, View, type ViewProps } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

/**
 * Full-screen backdrop: solid base colour + two soft brand "auroras" that give
 * the screen depth without any per-frame work (static gradients only).
 */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()
  const brand = theme.gradient.brand

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]} {...rest}>
      <LinearGradient
        colors={theme.gradient.glow as [string, string]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.glowTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[brand[2] + '22', brand[2] + '00'] as [string, string]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.2, y: 0.4 }}
        style={styles.glowBottom}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  glowTop: { position: 'absolute', top: -120, left: -60, right: -60, height: 460, borderRadius: 460 },
  glowBottom: { position: 'absolute', bottom: -140, right: -80, width: 380, height: 380, borderRadius: 380 },
})
