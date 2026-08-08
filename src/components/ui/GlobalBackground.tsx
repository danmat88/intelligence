import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg'
import { useTheme } from '../../theme/ThemeProvider'

export default function GlobalBackground() {
  const { theme } = useTheme()

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg }]}>
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
    </View>
  )
}

const styles = StyleSheet.create({
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
})
