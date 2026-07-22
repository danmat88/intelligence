import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import HomeScreen from '../screens/HomeScreen'
import PreparationScreen from '../screens/PreparationScreen'
import SettingsModal from '../screens/SettingsModal'
import SolverScreen from '../screens/SolverScreen'
import AppTabBar from './AppTabBar'
import type { AppTab, BacProfile, ExamGoal, SolveEntryAction, SolveEntryKind, SolverChrome } from './types'

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [goal, setGoal] = useState<ExamGoal>(null)
  const [bacProfile, setBacProfile] = useState<BacProfile>('Mate-info')
  const [solverChrome, setSolverChrome] = useState<SolverChrome>('idle')
  const [solveEntry, setSolveEntry] = useState<SolveEntryAction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const tabBarVisible = activeTab !== 'solve' || solverChrome === 'idle'

  const openSolver = useCallback((kind: SolveEntryKind) => {
    setSolveEntry({ id: Date.now(), kind })
    setActiveTab('solve')
  }, [])

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={[styles.layer, activeTab !== 'home' && styles.hidden]} pointerEvents={activeTab === 'home' ? 'auto' : 'none'}>
          <HomeScreen
            goal={goal}
            onSelectGoal={setGoal}
            onOpenPreparation={() => setActiveTab('practice')}
            onOpenSettings={() => setSettingsOpen(true)}
            onSolve={openSolver}
          />
        </View>
        <View style={[styles.layer, activeTab !== 'solve' && styles.hidden]} pointerEvents={activeTab === 'solve' ? 'auto' : 'none'}>
          <SolverScreen
            entryAction={solveEntry}
            onEntryActionHandled={() => setSolveEntry(null)}
            onChromeChange={setSolverChrome}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </View>
        <View style={[styles.layer, activeTab !== 'practice' && styles.hidden]} pointerEvents={activeTab === 'practice' ? 'auto' : 'none'}>
          <PreparationScreen
            goal={goal}
            bacProfile={bacProfile}
            onSelectGoal={setGoal}
            onSelectBacProfile={setBacProfile}
            onOpenSettings={() => setSettingsOpen(true)}
            onSolve={openSolver}
          />
        </View>
      </View>
      {tabBarVisible && <AppTabBar activeTab={activeTab} onChange={setActiveTab} />}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { flex: 1 }, layer: { flex: 1 }, hidden: { display: 'none' } })
