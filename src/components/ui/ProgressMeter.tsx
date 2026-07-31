import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

export default function ProgressMeter({ value, tone }: { value: number; tone?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  const percent = Math.max(0, Math.min(1, value)) * 100
  return (
    <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
      <View style={[styles.fill, { backgroundColor: tone ?? c.accent, width: `${percent}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { borderRadius: 99, height: 6, overflow: 'hidden' },
  fill: { borderRadius: 99, height: '100%' },
})
