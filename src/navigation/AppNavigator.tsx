import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import OnboardingScreen from '../screens/OnboardingScreen'
import PracticeSessionScreen from '../screens/PracticeSessionScreen'
import GeneralPracticeScreen from '../screens/GeneralPracticeScreen'
import SavedScreen from '../screens/SavedScreen'
import WorkspaceReveal from '../components/ui/WorkspaceReveal'
import { useTheme } from '../theme/ThemeProvider'
import { useProduct } from '../product/ProductProvider'
import type { PracticeConfig } from '../practice/generator'
import { getNativeOfficialPaper } from '../archive/content'
import MainNavigation from './MainNavigation'
import type {
  MainTabParamList,
  RootStackParamList,
  SolveEntryAction,
  SolveRouteParams,
} from './types'
import type { BacTrack } from '../product/profile'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()

type OpenSolve = (params?: SolveRouteParams) => void

function MainTabs({
  onOpenSettings,
  onSolve,
  onStartPractice,
  onOpenPaper,
}: {
  onOpenSettings: () => void
  onSolve: OpenSolve
  onStartPractice: (
    exam: 'en' | 'bac',
    options: { setId?: string; config?: PracticeConfig; mode?: 'practice' | 'simulation'; focusExerciseId?: string },
    bacTrack?: BacTrack,
  ) => void
  onOpenPaper: (
    item: import('../archive/content').NativeOfficialPaper,
    mode: import('../archive/store').OfficialPaperMode,
  ) => void
}) {
  const { goal } = useProduct()
  const examMode = goal === 'en' || goal === 'bac'

  const notebook = (
    initialMode: 'problems' | 'tests' | 'mistakes' | 'progress',
  ) => (
    <NotebookScreen
      onOpenSettings={onOpenSettings}
      onOpenProblem={(problem) => onSolve({ problem })}
      onSolve={() => onSolve()}
      onOpenPractice={(exam, setId, focusExerciseId, bacTrack) => onStartPractice(exam, { setId, focusExerciseId }, bacTrack)}
      onOpenOfficialAttempt={(attempt) => {
        const paper = getNativeOfficialPaper(attempt.packageId, attempt.profile)
        if (paper) onOpenPaper(paper, attempt.completedAt ? 'study' : attempt.mode)
      }}
      initialMode={initialMode}
    />
  )

  return (
    <Tabs.Navigator
      initialRouteName="Acasa"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <MainNavigation {...props} examMode={examMode} onSolve={() => onSolve()} />}
    >
      <Tabs.Screen name="Acasa">
        {({ navigation }) => (
          <HomeScreen
            onOpenSettings={onOpenSettings}
            onOpenPreparation={() => navigation.navigate('Exercitii')}
            onOpenMistakes={() => navigation.navigate('Activitate', { section: 'mistakes' })}
            onOpenProblem={(problem) => onSolve({ problem })}
            onSolve={(entry) => onSolve(entry ? { entry } : undefined)}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Exercitii">
        {() => examMode ? (
          <PreparationScreen
            onOpenSettings={onOpenSettings}
            onStartPractice={onStartPractice}
          />
        ) : (
          <GeneralPracticeScreen
            onOpenSettings={onOpenSettings}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Biblioteca">
        {({ route }) => examMode
          ? <SubjectsScreen onOpenSettings={onOpenSettings} onOpenPaper={onOpenPaper} onSolve={() => onSolve()} />
          : notebook(route.params?.section ?? 'problems')}
      </Tabs.Screen>
      <Tabs.Screen name="Activitate">
        {({ route }) => examMode
          ? notebook(route.params?.section ?? 'progress')
          : (
            <SavedScreen
              onOpenSettings={onOpenSettings}
              onOpenProblem={(problem) => onSolve({ problem })}
              onSolve={() => onSolve()}
            />
          )}
      </Tabs.Screen>
    </Tabs.Navigator>
  )
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

export default function AppNavigator() {
  const { theme } = useTheme()
  const { onboardingCompleted, hydrated, goal } = useProduct()
  const previousOnboarding = useRef(onboardingCompleted)
  const [showWorkspaceReveal, setShowWorkspaceReveal] = useState(false)

  useLayoutEffect(() => {
    if (hydrated && !previousOnboarding.current && onboardingCompleted) {
      setShowWorkspaceReveal(true)
    }
    previousOnboarding.current = onboardingCompleted
  }, [hydrated, onboardingCompleted])
  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.accent,
        background: theme.colors.bg,
        card: theme.colors.bgElevated,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.accent,
      },
    }),
    [theme],
  )

  return (
    <View style={styles.root}>
      <NavigationContainer theme={navigationTheme}>
        <RootStack.Navigator
          initialRouteName="Principal"
          screenOptions={{
            animation: 'fade',
            contentStyle: styles.transparent,
            gestureEnabled: true,
            headerShown: false,
          }}
        >
          <RootStack.Screen name="Principal">
            {({ navigation }) => (
              hydrated && !onboardingCompleted ? (
                <OnboardingScreen onSolve={() => navigation.navigate('Rezolva')} />
              ) : (
                <MainTabs
                  onOpenSettings={() => navigation.navigate('Setari')}
                  onSolve={(params) => navigation.navigate('Rezolva', params)}
                  onStartPractice={(exam, options, bacTrack) =>
                    navigation.navigate('Activitate', { exam, ...options, bacTrack })
                  }
                  onOpenPaper={(item, mode) => navigation.navigate('SubiectOficial', { item, mode })}
                />
              )
            )}
          </RootStack.Screen>
          <RootStack.Screen name="Rezolva" component={SolveRoute} />
          <RootStack.Screen name="Setari">
            {({ navigation }) => <SettingsScreen onBack={() => navigation.goBack()} />}
          </RootStack.Screen>
          <RootStack.Screen name="Activitate">
            {({ navigation, route }) => (
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
            )}
          </RootStack.Screen>
          <RootStack.Screen name="SubiectOficial">
            {({ navigation, route }) => (
              <OfficialPaperScreen
                item={route.params.item}
                initialMode={route.params.mode}
                onBack={() => navigation.goBack()}
              />
            )}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
      {showWorkspaceReveal && goal ? (
        <WorkspaceReveal goal={goal} onFinished={() => setShowWorkspaceReveal(false)} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
})
