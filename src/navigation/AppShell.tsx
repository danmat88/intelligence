import { useCallback, useEffect, useState } from 'react'
import { BackHandler, Keyboard, StyleSheet, View } from 'react-native'
import HomeScreen from '../screens/HomeScreen'
import PreparationScreen from '../screens/PreparationScreen'
import SettingsModal from '../screens/SettingsModal'
import SolverScreen from '../screens/SolverScreen'
import AppTabBar from './AppTabBar'
import { getShellBackAction } from './back'
import type { AppTab, BacProfile, ExamGoal, SolveEntryAction, SolveEntryKind, SolverChrome, SolverSurface } from './types'

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [goal, setGoal] = useState<ExamGoal>(null)
  const [bacProfile, setBacProfile] = useState<BacProfile>('Mate-info')
  const [solverChrome, setSolverChrome] = useState<SolverChrome>('idle')
  const [solverSurface, setSolverSurface] = useState<SolverSurface>('idle')
  const [solveEntry, setSolveEntry] = useState<SolveEntryAction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Camera and crop are root layers above the shell, so opening them must not
  // resize or animate the dock underneath. Only a solution thread actually
  // changes the browsing shell's bottom-edge layout.
  const tabBarVisible = activeTab !== 'solve' || solverSurface === 'idle'

  const openSolver = useCallback((kind: SolveEntryKind) => {
    setSolveEntry({ id: Date.now(), kind })
    setSolverSurface('idle')
    setActiveTab('solve')
  }, [])

  const changeTab = useCallback((tab: AppTab) => {
    Keyboard.dismiss()
    setActiveTab(tab)
  }, [])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const action = getShellBackAction({
        activeTab,
        solverChrome,
        solverSurface,
        settingsOpen,
      })
      if (action === 'defer' || action === 'exit') return false
      if (action === 'dismiss-keyboard') {
        Keyboard.dismiss()
        return true
      }
      if (action === 'solver-idle') {
        setSolverSurface('idle')
        return true
      }
      setActiveTab('home')
      return true
    })
    return () => subscription.remove()
  }, [activeTab, settingsOpen, solverChrome, solverSurface])

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
            surface={solverSurface}
            onOpenThread={() => setSolverSurface('thread')}
            onBackToIdle={() => setSolverSurface('idle')}
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
      <AppTabBar activeTab={activeTab} onChange={changeTab} visible={tabBarVisible} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  layer: { flex: 1 },
  hidden: { display: 'none' },
})
