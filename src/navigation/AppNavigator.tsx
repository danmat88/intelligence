import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import NotebookScreen from '../screens/NotebookScreen'
import PreparationScreen from '../screens/PreparationScreen'
import SubjectsScreen from '../screens/SubjectsScreen'
import OfficialPaperScreen from '../screens/OfficialPaperScreen'
import SettingsScreen from '../screens/SettingsScreen'
import SolverScreen from '../screens/SolverScreen'
import GoalSheet from '../screens/GoalSheet'
import AppHeader from '../components/ui/AppHeader'
import { useProduct } from '../product/ProductProvider'
import { useTheme } from '../theme/ThemeProvider'
import GeneralPracticeScreen from '../screens/GeneralPracticeScreen'
import SavedScreen from '../screens/SavedScreen'
import PracticeSessionScreen from '../screens/PracticeSessionScreen'
import MainNavigation from './MainNavigation'
import { GoalSheetContext } from './GoalSheetContext'
import ScreenBackground from '../components/ui/ScreenBackground'
import WelcomeScreen from '../screens/WelcomeScreen'
import OnboardingScreen from '../screens/OnboardingScreen'
import ProfileGateScreen from '../screens/ProfileGateScreen'
import AccountTransitionScreen from '../screens/AccountTransitionScreen'
import { useAppLifecycle } from './AppLifecycleProvider'
import { shouldOpenSolver, type AppEntry } from './lifecycle'
import type {
  MainTabParamList,
  RootStackParamList,
  SolveEntryAction,
  SolveRouteParams,
} from './types'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const AppEntryContext = createContext<{
  entry: AppEntry
  setEntry: (entry: AppEntry) => void
}>({ entry: 'home', setEntry: () => {} })

function AcasaTab() {
  return <HomeScreen />
}

function ExercitiiTab() {
  const { goal } = useProduct()
  const examMode = goal === 'en' || goal === 'bac'
  return examMode ? <PreparationScreen /> : <GeneralPracticeScreen />
}

function BibliotecaTab({ route }: any) {
  const { goal } = useProduct()
  const examMode = goal === 'en' || goal === 'bac'
  return examMode ? (
    <SubjectsScreen />
  ) : (
    <NotebookScreen initialMode={route.params?.section ?? 'problems'} />
  )
}

function ActivitateTab({ route }: any) {
  const { goal } = useProduct()
  const examMode = goal === 'en' || goal === 'bac'
  return examMode ? (
    <NotebookScreen initialMode={route.params?.section ?? 'progress'} />
  ) : (
    <SavedScreen />
  )
}

const MainTabs = memo(function MainTabs() {
  const { theme } = useTheme()

  return (
    <ScreenBackground style={styles.tabsRoot}>
      <AppHeader />
      <Tabs.Navigator
        initialRouteName="Acasa"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' }
        }}
        tabBar={(props) => <MainNavigation {...props} />}
      >
        <Tabs.Screen name="Acasa" component={AcasaTab} />
        <Tabs.Screen name="Exercitii" component={ExercitiiTab} />
        <Tabs.Screen name="Biblioteca" component={BibliotecaTab} />
        <Tabs.Screen name="Activitate" component={ActivitateTab} />
      </Tabs.Navigator>
    </ScreenBackground>
  )
})

function PrincipalRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Principal'>) {
  const { entry, setEntry } = useContext(AppEntryContext)

  useLayoutEffect(() => {
    if (!shouldOpenSolver(entry)) return
    // Keep Home underneath the solver so both the visible arrow and Android
    // Back always have a valid, useful destination after onboarding.
    navigation.navigate('Rezolva')
    setEntry('home')
  }, [entry, navigation, setEntry])

  return <MainTabs />
}

function SettingsRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Setari'>) {
  const openGoalSheet = useContext(GoalSheetContext)
  const onBack = useCallback(() => navigation.goBack(), [navigation])
  return <SettingsScreen onBack={onBack} onChangeGoal={openGoalSheet} />
}

function SolveRoute({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Rezolva'>) {
  const [surface, setSurface] = useState<'entry' | 'thread'>(
    route.params?.problem ? 'thread' : 'entry',
  )
  const firstEntryRef = useRef<SolveEntryAction | null>(
    route.params?.entry
      ? { id: Date.now(), kind: route.params.entry }
      : null,
  )
  const [entryAction, setEntryAction] = useState(firstEntryRef.current)

  return (
    <SolverScreen
      entryAction={entryAction}
      initialProblem={route.params?.problem}
      initialDraft={route.params?.initialDraft}
      onEntryActionHandled={() => setEntryAction(null)}
      surface={surface}
      onOpenThread={() => setSurface('thread')}
      onShowEntry={() => setSurface('entry')}
      onExit={() => navigation.goBack()}
    />
  )
}

function ActivitateRoute({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Activitate'>) {
  return (
    <PracticeSessionScreen
      exam={route.params.exam}
      setId={route.params.setId}
      config={route.params.config}
      bacTrack={route.params.bacTrack}
      mode={route.params.mode}
      focusExerciseId={route.params.focusExerciseId}
      onBack={() => navigation.goBack()}
      onFinish={() => navigation.goBack()}
    />
  )
}

function SubiectOficialRoute({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'SubiectOficial'>) {
  return (
    <OfficialPaperScreen
      item={route.params.item}
      initialMode={route.params.mode}
      onBack={() => navigation.goBack()}
    />
  )
}

function OnboardingRoute() {
  const { completeOnboarding } = useProduct()
  const { setEntry: setAppEntry } = useContext(AppEntryContext)
  const startSolving = useCallback(async () => {
    setAppEntry('solver')
    try {
      await completeOnboarding(null)
    } catch (error) {
      setAppEntry('home')
      throw error
    }
  }, [completeOnboarding, setAppEntry])

  return <OnboardingScreen onSolve={startSolving} />
}

export default function AppNavigator() {
  const { phase, sessionId, navigationKey } = useAppLifecycle()
  const [appEntry, setAppEntry] = useState<AppEntry>('home')
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const openGoalSheet = useCallback(() => setGoalSheetOpen(true), [])
  const closeGoalSheet = useCallback(() => setGoalSheetOpen(false), [])
  const { theme } = useTheme()
  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.accent,
        background: 'transparent',
        card: theme.colors.bgElevated,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    }),
    [theme],
  )
  const appEntryValue = useMemo(
    () => ({ entry: appEntry, setEntry: setAppEntry }),
    [appEntry],
  )

  useEffect(() => {
    // Entry intent belongs to one Firebase identity. It must not survive logout
    // or an account switch and unexpectedly reopen the solver next time.
    setAppEntry('home')
  }, [sessionId])

  useEffect(() => {
    if (phase !== 'app') setGoalSheetOpen(false)
  }, [phase])

  if (phase === 'auth-loading') return null

  return (
    <View style={styles.root}>
      <GoalSheetContext.Provider value={openGoalSheet}>
        <AppEntryContext.Provider value={appEntryValue}>
        <NavigationContainer key={navigationKey} theme={navigationTheme}>
          <RootStack.Navigator
            initialRouteName={phase === 'app' ? 'Principal' : undefined}
            screenOptions={{
              animation: 'fade',
              contentStyle: styles.transparent,
              gestureEnabled: true,
              headerShown: false,
            }}
          >
            {phase === 'signed-out' ? (
              <RootStack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ animationTypeForReplace: 'pop' }}
              />
            ) : phase === 'account-transition' ? (
              <RootStack.Screen name="AccountTransition" component={AccountTransitionScreen} />
            ) : phase === 'profile-loading' || phase === 'profile-error' ? (
              <RootStack.Screen name="ProfileGate" component={ProfileGateScreen} />
            ) : phase === 'onboarding' ? (
              <RootStack.Screen name="Onboarding" component={OnboardingRoute} />
            ) : (
              <>
                <RootStack.Screen name="Principal" component={PrincipalRoute} />
                <RootStack.Screen name="Rezolva" component={SolveRoute} />
                <RootStack.Screen
                  name="Setari"
                  component={SettingsRoute}
                  options={{
                    animation: 'slide_from_right',
                    contentStyle: { backgroundColor: navigationTheme.colors.background }
                  }}
                />
                <RootStack.Screen name="Activitate" component={ActivitateRoute} />
                <RootStack.Screen name="SubiectOficial" component={SubiectOficialRoute} />
              </>
            )}
          </RootStack.Navigator>
        </NavigationContainer>
        </AppEntryContext.Provider>
        <GoalSheet open={goalSheetOpen} onClose={closeGoalSheet} />
      </GoalSheetContext.Provider>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabsRoot: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
})
