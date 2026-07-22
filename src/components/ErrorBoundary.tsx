import { Component, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { getCrashlytics, recordError } from '@react-native-firebase/crashlytics'
import * as Updates from 'expo-updates'

/**
 * Last line of defense: a rendering crash anywhere below shows this recovery
 * screen instead of closing the app, and the error is reported to Crashlytics
 * so it's visible in the Firebase console with a full stack trace.
 *
 * Deliberately styled with plain constants, not the theme - if the crash is in
 * the theme/provider layer, this screen must still render.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    try {
      recordError(getCrashlytics(), error, 'react-error-boundary')
    } catch {
      // never let reporting itself take the recovery screen down
    }
  }

  private restart = () => {
    // full JS reload: fresh state, and picks up any pending OTA fix
    Updates.reloadAsync().catch(() => this.setState({ failed: false }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.signal} />
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>!</Text>
          </View>
          <Text style={styles.eyebrow}>REZOLVO</Text>
          <Text style={styles.title}>A apărut o problemă</Text>
          <Text style={styles.body}>
            Eroarea a fost raportată automat. Repornește aplicația ca să continui — rezolvările tale sunt în siguranță.
          </Text>
          <Pressable onPress={this.restart} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.82 : 1 }]}>
            <Text style={styles.btnLabel}>Repornește aplicația</Text>
          </Pressable>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F4F5FA', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: {
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    backgroundColor: '#FCFCFF',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#15121F',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  signal: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: '#6847F5' },
  badge: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#15121F', alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 28 },
  eyebrow: { marginTop: 22, color: '#6847F5', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { marginTop: 7, color: '#15121F', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  body: { marginTop: 10, color: '#656174', fontSize: 15, lineHeight: 22 },
  btn: { marginTop: 24, backgroundColor: '#15121F', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 15, alignItems: 'center' },
  btnLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
})
