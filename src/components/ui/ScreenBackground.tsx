import { StyleSheet, View, type ViewProps } from 'react-native'
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'

/** A subtle exercise-book texture behind stable, high-contrast content. */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }, style]} {...rest}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="paperDots" width="22" height="22" patternUnits="userSpaceOnUse">
              <Circle cx="3" cy="3" r="2.2" fill="rgba(25,49,73,0.045)" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#paperDots)" />
        </Svg>
      </View>
      <View
        pointerEvents="none"
        style={[styles.sun, { backgroundColor: theme.colors.sunnySoft }]}
      />
      <View
        pointerEvents="none"
        style={[styles.chalkGlow, { backgroundColor: theme.colors.chalkDark }]}
      />
      <View style={styles.content}>{children}</View>
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
