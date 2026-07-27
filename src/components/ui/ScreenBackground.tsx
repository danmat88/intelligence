import { StyleSheet, View, type ViewProps } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/ThemeProvider'
import GraphPaper from './GraphPaper'

/** One continuous warm notebook canvas shared by the entire interface. */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }, style]} {...rest}>
      <LinearGradient
        pointerEvents="none"
        colors={['#FFFCF3', '#FFF8E7', '#FFF1CE']}
        locations={[0, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <GraphPaper color="rgba(25,49,73,0.035)" />
      <View pointerEvents="none" style={[styles.doodle, styles.doodleTop, { borderColor: theme.colors.sunny }]} />
      <View pointerEvents="none" style={[styles.doodle, styles.doodleBottom, { borderColor: theme.colors.accent }]} />
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.colors.sunnySoft }]} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    opacity: 0.5,
    top: -230,
    right: -170,
  },
  doodle: {
    borderRadius: 999,
    borderWidth: 9,
    height: 54,
    opacity: 0.13,
    position: 'absolute',
    transform: [{ rotate: '-8deg' }],
    width: 54,
  },
  doodleTop: { left: -18, top: 150 },
  doodleBottom: { bottom: 118, right: -21 },
  content: { flex: 1, zIndex: 1 },
})
