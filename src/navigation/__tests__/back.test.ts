import { getShellBackAction } from '../back'

const base = {
  activeTab: 'home' as const,
  solverChrome: 'idle' as const,
  solverSurface: 'idle' as const,
  settingsOpen: false,
}

describe('shell Back contract', () => {
  it('lets the system exit only from the start destination', () => {
    expect(getShellBackAction(base)).toBe('exit')
  })

  it('returns top-level destinations to Acasă', () => {
    expect(getShellBackAction({ ...base, activeTab: 'practice' })).toBe('home')
    expect(getShellBackAction({ ...base, activeTab: 'solve' })).toBe('home')
  })

  it('dismisses solver typing before navigating', () => {
    expect(
      getShellBackAction({ ...base, activeTab: 'solve', solverChrome: 'focused' }),
    ).toBe('dismiss-keyboard')
  })

  it('returns a solution to solver idle without destroying the thread', () => {
    expect(
      getShellBackAction({
        ...base,
        activeTab: 'solve',
        solverChrome: 'thread',
        solverSurface: 'thread',
      }),
    ).toBe('solver-idle')
  })

  it('defers to the topmost overlay', () => {
    expect(getShellBackAction({ ...base, settingsOpen: true })).toBe('defer')
    expect(getShellBackAction({ ...base, solverChrome: 'overlay' })).toBe('defer')
  })
})
