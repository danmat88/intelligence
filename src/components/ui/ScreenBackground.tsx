import { StyleSheet, View, type ViewProps } from 'react-native'
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'

/**
 * Cartoon exercise-book background surface: warm paper background (#FFF8E7),
 * authentic math graph grid lines (#EADFCD), red margin guideline, and sunny ambient glow.
 */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }, style]} {...rest}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="mathGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <Line x1="0" y1="24" x2="24" y2="24" stroke="#EADFCD" strokeWidth="1" />
              <Line x1="24" y1="0" x2="24" y2="24" stroke="#EADFCD" strokeWidth="1" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#mathGrid)" />
        </Svg>
      </View>

      <View pointerEvents="none" style={styles.notebookMargin} />

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
  notebookMargin: {
    borderRightColor: 'rgba(232, 75, 58, 0.22)',
    borderRightWidth: 1.5,
    bottom: 0,
    left: 20,
    position: 'absolute',
    top: 0,
    width: 1,
  },
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
    opacity: 0.04,
    position: 'absolute',
    width: 300,
  },
  content: { flex: 1 },
})
