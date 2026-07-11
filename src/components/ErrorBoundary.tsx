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
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The error has been reported automatically. Restart to continue - your chats are safe.
        </Text>
        <Pressable onPress={this.restart} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.btnLabel}>Restart app</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F7F6F2', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { color: '#1A1626', fontSize: 22, fontWeight: '700' },
  body: { color: '#5D5870', fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  btn: { marginTop: 12, backgroundColor: '#6355FF', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 },
  btnLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
})
