import { StyleSheet, View, type ViewProps } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import GraphPaper from './GraphPaper'

/**
 * Full-screen backdrop: cool paper with a faint graph-paper grid behind
 * everything — the math vernacular. Content sits above the grid; opaque cards
 * and the composer cover it, so it only shows through the open paper areas.
 */
export default function ScreenBackground({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme()
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }, style]} {...rest}>
      <GraphPaper />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, zIndex: 1 },
})
