import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import BrandGradient from './BrandGradient'

type Props = {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

/** Primary action: the signature brand gradient in a pill, with press feedback. */
export default function GradientButton({ label, onPress, loading, disabled, style }: Props) {
  const { theme } = useTheme()
  const off = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        { opacity: off ? 0.5 : 1, transform: [{ scale: pressed && !off ? 0.98 : 1 }] },
        style,
      ]}
    >
      <BrandGradient style={[styles.btn, { borderRadius: theme.radius.pill }]}>
        {loading ? (
          <ActivityIndicator color={theme.colors.onAccent} />
        ) : (
          <Text style={[styles.label, { color: theme.colors.onAccent }]}>{label}</Text>
        )}
      </BrandGradient>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
})
