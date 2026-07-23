import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../theme/ThemeProvider'
import IconTile from './IconTile'
import Press from './Press'
import RezIcon, { type RezIconName } from './RezIcon'
import Txt from './Txt'

/** Static product signature shared by every panel. */
export function SignatureHandle({ dark = false }: { dark?: boolean }) {
  return (
    <View style={styles.handleTrack} pointerEvents="none">
      <View style={[styles.handleDot, { backgroundColor: dark ? 'rgba(255,255,255,0.28)' : 'rgba(104,71,245,0.24)' }]} />
      <LinearGradient colors={['#A995FF', '#6847F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.handleSignal} />
      <View style={[styles.handleDot, { backgroundColor: dark ? 'rgba(255,255,255,0.28)' : 'rgba(104,71,245,0.24)' }]} />
    </View>
  )
}

/** Decorative sheet rails. They never move and never take input. */
export function SheetSignals({ dark = false }: { dark?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={dark ? ['rgba(169,149,255,0.8)', 'rgba(156,255,204,0.45)', 'transparent'] : ['#6847F5', '#A995FF', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topSignal}
      />
      <View style={[styles.sheetCorner, dark && styles.sheetCornerDark]} />
    </View>
  )
}

export function SheetHeader({
  title,
  icon,
  onClose,
  closeLabel,
  dark = false,
}: {
  title: ReactNode
  icon: RezIconName
  onClose: () => void
  closeLabel: string
  dark?: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={styles.header}>
      <View style={styles.titleLockup}>
        <IconTile name={icon} size={38} iconSize={18} tone={dark ? 'ink' : 'violet'} />
        <View style={styles.titleCopy}>
          <Txt size={9} color={dark ? 'rgba(255,255,255,0.42)' : c.textFaint} style={{ fontFamily: theme.font.mono, letterSpacing: 1.1 }}>
            REZOLVO / PANOU
          </Txt>
          {typeof title === 'string' ? (
            <Txt style={{ color: dark ? '#FFFFFF' : c.text, fontFamily: theme.font.display, fontSize: 22, letterSpacing: -0.7 }}>{title}</Txt>
          ) : (
            title
          )}
        </View>
      </View>
      <Press
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        scaleTo={0.92}
        style={[styles.close, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : c.surfaceAlt, borderColor: dark ? 'rgba(255,255,255,0.1)' : c.border }]}
      >
        <RezIcon name="close" size={16} color={dark ? 'rgba(255,255,255,0.74)' : c.textMuted} accent={dark ? '#A995FF' : c.accent} />
      </Press>
    </View>
  )
}

const styles = StyleSheet.create({
  handleTrack: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 5, height: 12, justifyContent: 'center', marginBottom: 8 },
  handleSignal: { borderRadius: 999, height: 4, width: 32 },
  handleDot: { borderRadius: 999, height: 3, width: 3 },
  topSignal: { height: 3, left: 28, position: 'absolute', top: 0, width: 112 },
  sheetCorner: { borderColor: 'rgba(104,71,245,0.13)', borderRightWidth: 1, borderTopWidth: 1, height: 38, position: 'absolute', right: 15, top: 15, width: 38 },
  sheetCornerDark: { borderColor: 'rgba(169,149,255,0.16)' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 1 },
  titleLockup: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  titleCopy: { gap: 1 },
  close: { alignItems: 'center', borderRadius: 13, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
})
