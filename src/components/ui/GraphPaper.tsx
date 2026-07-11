import { useMemo } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

const CELL = 26

/**
 * Faint graph-paper grid — the math vernacular, sitting behind every screen.
 * Pure absolutely-positioned hairlines, so it needs no native SVG module.
 */
export default function GraphPaper({ color = 'rgba(99,85,255,0.05)' }: { color?: string }) {
  const { width, height } = useWindowDimensions()
  const xs = useMemo(() => Array.from({ length: Math.ceil(width / CELL) + 1 }, (_, i) => i * CELL), [width])
  const ys = useMemo(() => Array.from({ length: Math.ceil(height / CELL) + 1 }, (_, i) => i * CELL), [height])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {xs.map((x) => (
        <View key={`v${x}`} style={[styles.v, { left: x, backgroundColor: color }]} />
      ))}
      {ys.map((y) => (
        <View key={`h${y}`} style={[styles.h, { top: y, backgroundColor: color }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  v: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  h: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
})
