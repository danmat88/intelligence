import { View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider'
import { AuthProvider, useAuth } from './src/auth/AuthProvider'
import { ChatProvider } from './src/chat/store'
import ErrorBoundary from './src/components/ErrorBoundary'
import ChatScreen from './src/screens/ChatScreen'
import WelcomeScreen from './src/screens/WelcomeScreen'

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <ThemeProvider>
            <AuthProvider>{fontsLoaded ? <Gate /> : <Splash />}</AuthProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}

/** Requires a Google account before the chat: Welcome when signed out. */
function Gate() {
  const { user, initializing } = useAuth()
  if (initializing) return <Splash />
  if (!user) return <WelcomeScreen />
  return (
    <ChatProvider>
      <ChatScreen />
    </ChatProvider>
  )
}

/** Themed blank frame shown for the split second Inter is loading. */
function Splash() {
  const { theme } = useTheme()
  return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />
}
