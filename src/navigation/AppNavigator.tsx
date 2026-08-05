import { createContext, memo, useCallback, useContext, useMemo, useRef, useState } from 'react'
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
const GoalSheetContext = createContext<() => void>(() => {})

const MainTabs = memo(function MainTabs({
  onOpenSettings,
  onChangeGoal,
  onSolve,
  onStartPractice,
  onOpenPaper,
}: {
  onOpenSettings: () => void
  onChangeGoal: () => void
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
  const { theme } = useTheme()
  const examMode = goal === 'en' || goal === 'bac'

  const notebook = (
    initialMode: 'problems' | 'tests' | 'mistakes' | 'progress',
  ) => (
    <NotebookScreen
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
    <View style={[styles.tabsRoot, { backgroundColor: theme.colors.bg }]}>
      <AppHeader onOpenSettings={onOpenSettings} />
      <Tabs.Navigator
        initialRouteName="Acasa"
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <MainNavigation {...props} examMode={examMode} onSolve={() => onSolve()} />}
      >
      <Tabs.Screen name="Acasa">
        {({ navigation }) => (
          <HomeScreen
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
            onChangeGoal={onChangeGoal}
            onStartPractice={onStartPractice}
          />
        ) : (
          <GeneralPracticeScreen
            onChangeGoal={onChangeGoal}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Biblioteca">
        {({ route }) => examMode
          ? <SubjectsScreen onChangeGoal={onChangeGoal} onOpenPaper={onOpenPaper} onSolve={() => onSolve()} />
          : notebook(route.params?.section ?? 'problems')}
      </Tabs.Screen>
      <Tabs.Screen name="Activitate">
        {({ route }) => examMode
          ? notebook(route.params?.section ?? 'progress')
          : (
            <SavedScreen
              onOpenProblem={(problem) => onSolve({ problem })}
              onSolve={() => onSolve()}
            />
          )}
      </Tabs.Screen>
      </Tabs.Navigator>
    </View>
  )
})

function PrincipalRoute({ navigation }: NativeStackScreenProps<RootStackParamList, 'Principal'>) {
  const openGoalSheet = useContext(GoalSheetContext)
  const onOpenSettings = useCallback(() => navigation.navigate('Setari'), [navigation])
  const onSolve = useCallback((params?: SolveRouteParams) => navigation.navigate('Rezolva', params), [navigation])
  const onStartPractice = useCallback(
    (
      exam: 'en' | 'bac',
      options: { setId?: string; config?: PracticeConfig; mode?: 'practice' | 'simulation'; focusExerciseId?: string },
      bacTrack?: BacTrack,
    ) => navigation.navigate('Activitate', { exam, ...options, bacTrack }),
    [navigation],
  )
  const onOpenPaper = useCallback(
    (item: import('../archive/content').NativeOfficialPaper, mode: import('../archive/store').OfficialPaperMode) =>
      navigation.navigate('SubiectOficial', { item, mode }),
    [navigation],
  )

  return (
    <MainTabs
      onOpenSettings={onOpenSettings}
      onChangeGoal={openGoalSheet}
      onSolve={onSolve}
      onStartPractice={onStartPractice}
      onOpenPaper={onOpenPaper}
    />
  )
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

export default function AppNavigator({ startInSolver = false }: { startInSolver?: boolean }) {
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
      <GoalSheetContext.Provider value={openGoalSheet}>
        <NavigationContainer theme={navigationTheme}>
          <RootStack.Navigator
            initialRouteName={startInSolver ? 'Rezolva' : 'Principal'}
            screenOptions={{
              animation: 'fade',
              contentStyle: styles.transparent,
              gestureEnabled: true,
              headerShown: false,
            }}
          >
          <RootStack.Screen name="Principal" component={PrincipalRoute} />
          <RootStack.Screen name="Rezolva" component={SolveRoute} />
          <RootStack.Screen name="Setari" component={SettingsRoute} />
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
