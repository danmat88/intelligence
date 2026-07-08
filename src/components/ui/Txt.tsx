import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold'

type Props = TextProps & {
  weight?: Weight
  size?: number
  color?: string
  style?: StyleProp<TextStyle>
}

/**
 * The app's only text primitive. Applies the Inter family for the given weight
 * (named families carry their own weight, so we never set fontWeight alongside).
 * Use this instead of <Text> everywhere for consistent typography.
 */
export default function Txt({ weight = 'regular', size, color, style, ...rest }: Props) {
  const { theme } = useTheme()
  return (
    <Text
      style={[
        { fontFamily: theme.font[weight], color: color ?? theme.colors.text },
        size != null ? { fontSize: size } : null,
        style,
      ]}
      {...rest}
    />
  )
}
