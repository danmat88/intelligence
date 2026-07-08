import { useEffect } from 'react'
import { AppState, Pressable, StyleSheet } from 'react-native'
import * as Updates from 'expo-updates'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../theme/ThemeProvider'
import Txt from './Txt'

/**
 * Keeps installed apps current without the user thinking about it:
 * every time the app comes to the foreground it checks for a published OTA
 * update and downloads it; once one is ready, this slim banner offers a
 * one-tap restart. Without it, users are always one session behind.
 * Renders nothing in development or when up to date.
 */
export default function UpdateBanner() {
  const { theme } = useTheme()
  const c = theme.colors
  const { isUpdatePending } = Updates.useUpdates()

  useEffect(() => {
    if (__DEV__) return // the dev client serves from Metro; no OTA there
    const check = async () => {
      try {
        const status = await Updates.checkForUpdateAsync()
        if (status.isAvailable) await Updates.fetchUpdateAsync()
      } catch {
        // offline or between publishes - try again on next foreground
      }
    }
    check()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check()
    })
    return () => sub.remove()
  }, [])

  if (!isUpdatePending) return null

  return (
    <Pressable
      onPress={() => Updates.reloadAsync().catch(() => {})}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderRadius: theme.radius.pill,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather name="download" size={14} color={c.accent} />
      <Txt size={13} weight="semibold" color={c.accent}>
        Update ready — tap to restart
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 6,
  },
})
