import { StyleSheet, View, type ViewStyle } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import RezIcon, { type RezIconName } from './RezIcon'

export type IconTileTone = 'violet' | 'ink' | 'paper' | 'mint' | 'amber' | 'danger'

type Props = {
  name: RezIconName
  size?: number
  iconSize?: number
  tone?: IconTileTone
  selected?: boolean
  verified?: boolean
  disabled?: boolean
  style?: ViewStyle
}

/**
 * Rezolvo's icon container: a compact mathematical tile with one corner
 * signal. It gives every glyph the same silhouette without turning the app
 * into a grid of unrelated rounded cards.
 */
export default function IconTile({
  name,
  size = 38,
  iconSize = Math.round(size * 0.48),
  tone = 'violet',
  selected = false,
  verified = false,
  disabled = false,
  style,
}: Props) {
  const { theme } = useTheme()
  const c = theme.colors
  const palette = {
    violet: { bg: c.accentSoft, border: 'rgba(104,71,245,0.15)', icon: c.accent, signal: c.accent },
    ink: { bg: c.text, border: c.text, icon: '#FFFFFF', signal: '#A995FF' },
    paper: { bg: c.surface, border: c.border, icon: c.text, signal: c.accent },
    mint: { bg: c.successSoft, border: 'rgba(7,139,97,0.15)', icon: c.success, signal: '#34D39A' },
    amber: { bg: '#FFF3D6', border: 'rgba(181,106,0,0.16)', icon: '#A65F00', signal: '#FFB52E' },
    danger: { bg: c.dangerSoft, border: 'rgba(229,72,77,0.15)', icon: c.danger, signal: c.danger },
  }[tone]
  const active = disabled
    ? { bg: c.surfaceAlt, border: c.border, icon: c.textFaint, signal: c.textFaint }
    : selected
      ? { bg: c.accent, border: c.accent, icon: '#FFFFFF', signal: '#9CFFCC' }
      : palette
  const radius = Math.round(size * 0.31)

  return (
    <View
      pointerEvents="none"
      style={[
        styles.tile,
        {
          backgroundColor: active.bg,
          borderColor: active.border,
          borderRadius: radius,
          height: size,
          width: size,
        },
        style,
      ]}
    >
      <View style={[styles.corner, { borderColor: active.signal }]} />
      <RezIcon name={name} size={iconSize} color={active.icon} accent={active.signal} />
      {verified && (
        <View style={styles.verified}>
          <RezIcon name="check" size={9} color="#075D43" accent="#075D43" strokeWidth={2.25} />
        </View>
      )}
    </View>
  )
}

export function SelectionMark({ active, dark = false }: { active: boolean; dark?: boolean }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View
      pointerEvents="none"
      style={[
        styles.selection,
        {
          backgroundColor: active ? (dark ? '#9CFFCC' : c.accent) : 'transparent',
          borderColor: active ? (dark ? '#9CFFCC' : c.accent) : dark ? 'rgba(255,255,255,0.3)' : c.border,
        },
      ]}
    >
      {active && <RezIcon name="check" size={10} color={dark ? '#075D43' : '#FFFFFF'} accent={dark ? '#075D43' : '#FFFFFF'} strokeWidth={2.3} />}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  corner: { borderRightWidth: 1.5, borderTopWidth: 1.5, height: 8, position: 'absolute', right: 4, top: 4, width: 8 },
  verified: { alignItems: 'center', backgroundColor: '#9CFFCC', borderColor: '#FFFFFF', borderRadius: 8, borderWidth: 1.5, bottom: -2, height: 16, justifyContent: 'center', position: 'absolute', right: -2, width: 16 },
  selection: { alignItems: 'center', borderRadius: 999, borderWidth: 1.5, height: 20, justifyContent: 'center', width: 20 },
})
