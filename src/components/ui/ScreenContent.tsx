import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'

export const APP_CONTENT_MAX_WIDTH = 720
export const APP_GUTTER = 18
export const APP_GUTTER_COMPACT = 16

/**
 * The shared content grid for every app-owned screen.
 *
 * Headers, top-level pages, focused workspaces and panels can use different
 * chrome, but their readable content always lands on this same centered axis.
 */
export default function ScreenContent({
  children,
  style,
  compactStyle,
  ...rest
}: ViewProps & { compactStyle?: StyleProp<ViewStyle> }) {
  const { height } = useWindowDimensions()
  const compact = height < 760

  return (
    <View
      style={[styles.root, compact && styles.compact, style, compact && compactStyle]}
      {...rest}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: APP_CONTENT_MAX_WIDTH,
    paddingHorizontal: APP_GUTTER,
    width: '100%',
  },
  compact: {
    paddingHorizontal: APP_GUTTER_COMPACT,
  },
})
