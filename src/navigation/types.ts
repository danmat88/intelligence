export type AppTab = 'home' | 'solve' | 'practice'

export type ExamGoal = 'en' | 'bac' | null

/** States in which the solver needs the full screen rather than app chrome. */
export type SolverChrome = 'idle' | 'focused' | 'thread' | 'capture'

export type SolveEntryKind = 'camera' | 'library' | 'type'

export type SolveEntryAction = { id: number; kind: SolveEntryKind }

export type BacProfile = 'Mate-info' | 'Științe ale naturii' | 'Tehnologic' | 'Pedagogic'
