import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import { useAuth } from '../../auth/AuthProvider'
import BrandGradient from '../ui/BrandGradient'
import Txt from '../ui/Txt'

/** Time-of-day greeting, personalized with the user's first name. */
function greeting(name?: string | null): string {
  const h = new Date().getHours()
  const base = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const first = name?.trim().split(/\s+/)[0]
  return first ? `${base}, ${first}` : base
}

/**
 * A new empty chat: just the mark and the greeting. Quiet, focused - the
 * conversation is the product.
 */
export default function EmptyState(_props: { onPick?: (t: string) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { user } = useAuth()

  return (
    <View style={styles.wrap}>
      <Rise delay={0}>
        <View style={styles.orbBox}>
          <View style={[styles.orbRing, { borderColor: c.accent + '33' }]} />
          <BrandGradient style={styles.orbCore}>
            <Ionicons name="sparkles" size={32} color={c.onAccent} />
          </BrandGradient>
        </View>
      </Rise>
      <Rise delay={70}>
        <Txt size={27} style={{ letterSpacing: -0.6, fontFamily: theme.font.display, textAlign: 'center' }}>
          {greeting(user?.name)}
        </Txt>
      </Rise>
    </View>
  )
}

/** One-shot entrance on arrival (user-caused); never loops. */
function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(12)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start()
  }, [opacity, y, delay])
  return <Animated.View style={{ opacity, transform: [{ translateY: y }], alignItems: 'center' }}>{children}</Animated.View>
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  orbBox: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  orbRing: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 1.5 },
  orbCore: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
})
