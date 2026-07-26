import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useOverlayHost } from './OverlayHost'

/**
 * Places an app-owned fullscreen route above the complete shell without
 * changing the shell's layout or opening another native window.
 */
export default function RootLayer({ children }: { children: ReactNode }) {
  const host = useOverlayHost()
  const id = useRef(`root-layer-${Math.random().toString(36).slice(2)}`).current
  const node = (
    <View pointerEvents="auto" style={styles.layer}>
      {children}
    </View>
  )

  useLayoutEffect(() => {
    host.set(id, node)
  }, [host, id, node])

  useEffect(() => () => host.remove(id), [host, id])

  return null
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
})
