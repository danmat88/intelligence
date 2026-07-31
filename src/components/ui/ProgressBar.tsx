import { StyleSheet, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

type Props = {
  progress: number // 0 to 1
  height?: number
  tone?: 'green' | 'blue' | 'yellow' | 'red'
}

export default function ProgressBar({ progress, height = 18, tone = 'green' }: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  const clamped = Math.max(0, Math.min(1, progress))

  const getFill = () => {
    switch (tone) {
      case 'blue':
        return { fill: c.bubblyBlue, edge: c.bubblyBlueDark }
      case 'yellow':
        return { fill: c.bubblyYellow, edge: c.bubblyYellowDark }
      case 'red':
        return { fill: c.bubblyRed, edge: c.bubblyRedDark }
      case 'green':
      default:
        return { fill: c.bubblyGreen, edge: c.bubblyGreenDark }
    }
  }

  const { fill, edge } = getFill()

  return (
    <View style={[styles.track, { height, backgroundColor: '#E5E5E5', borderColor: '#D0D0D0' }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.round(clamped * 100)}%`,
            backgroundColor: fill,
            borderBottomColor: edge,
            borderBottomWidth: Math.max(2, Math.round(height * 0.2)),
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 99,
    borderWidth: 2,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 99,
    height: '100%',
  },
})
