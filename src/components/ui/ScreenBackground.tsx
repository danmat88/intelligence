import { StyleSheet, View, type ViewProps } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/ThemeProvider'

/** One continuous porcelain canvas shared by the entire new interface. */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }, style]} {...rest}>
      <LinearGradient
        pointerEvents="none"
        colors={['#FAFAFD', '#F4F5FA', '#F0EFF8']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.glow} />
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
    backgroundColor: 'rgba(104,71,245,0.065)',
    top: -230,
    right: -170,
  },
  content: { flex: 1, zIndex: 1 },
})
