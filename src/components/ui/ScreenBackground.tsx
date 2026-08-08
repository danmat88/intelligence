import { StyleSheet, View, type ViewProps } from 'react-native'
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'

export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  sun: {
    borderRadius: 180,
    height: 280,
    opacity: 0.38,
    position: 'absolute',
    right: -130,
    top: -150,
    width: 280,
  },
  chalkGlow: {
    borderRadius: 200,
    bottom: -180,
    height: 300,
    left: -160,
    opacity: 0.045,
    position: 'absolute',
    width: 300,
  },
  content: { flex: 1 },
})
