import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import BrandLockup from '../components/ui/BrandLockup'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'
import { useTheme } from '../theme/ThemeProvider'

/** Neutral handoff used only while account ownership is changing. */
export default function AccountTransitionScreen() {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <ScreenBackground>
      <View style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
        <BrandLockup />
        <View style={styles.center} accessibilityRole="progressbar">
          <ActivityIndicator size="large" color={theme.colors.bubblyRed} />
          <Txt
            style={[styles.title, { color: theme.colors.text, fontFamily: theme.font.display }]}
          >
            Finalizăm schimbarea
          </Txt>
          <Txt size={14.5} color={theme.colors.textMuted} style={styles.copy}>
            Protejăm datele sesiunii înainte să continuăm.
          </Txt>
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingBottom: 52 },
  title: { fontSize: 29, letterSpacing: -0.9, lineHeight: 35, marginTop: 22, textAlign: 'center' },
  copy: { lineHeight: 21, marginTop: 7, maxWidth: 380, textAlign: 'center' },
})
