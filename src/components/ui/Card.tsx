import { View, type ViewProps } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

type Props = ViewProps & { padded?: boolean; alt?: boolean }

/** Elevated surface with border, radius and a soft shadow. The app's basic slab. */
export default function Card({ children, style, padded = true, alt = false, ...rest }: Props) {
  const { theme } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: alt ? theme.colors.surfaceAlt : theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          padding: padded ? theme.space(5) : 0,
          ...theme.shadow.soft,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
