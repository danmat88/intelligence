import type { AppTab, SolverChrome, SolverSurface } from './types'

export type ShellBackAction =
  | 'defer'
  | 'dismiss-keyboard'
  | 'solver-idle'
  | 'home'
  | 'exit'

/**
 * One Back contract for the visible app affordance and Android system Back.
 * Overlays and fullscreen capture own Back while they are on top.
 */
export function getShellBackAction({
  activeTab,
  solverChrome,
  solverSurface,
  settingsOpen,
}: {
  activeTab: AppTab
  solverChrome: SolverChrome
  solverSurface: SolverSurface
  settingsOpen: boolean
}): ShellBackAction {
  if (settingsOpen || solverChrome === 'overlay' || solverChrome === 'capture') return 'defer'
  if (activeTab === 'solve' && solverChrome === 'focused') return 'dismiss-keyboard'
  if (activeTab === 'solve' && solverSurface === 'thread') return 'solver-idle'
  if (activeTab !== 'home') return 'home'
  return 'exit'
}
