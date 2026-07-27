export type AppTab = 'home' | 'solve' | 'practice'

export type ExamGoal = 'en' | 'bac' | null

/** The solver route is separate from its retained conversation data. */
export type SolverSurface = 'idle' | 'thread'

/** States in which the solver needs the full screen rather than app chrome. */
export type SolverChrome = 'idle' | 'focused' | 'thread' | 'capture' | 'overlay'

export type SolveEntryKind = 'camera' | 'library' | 'type'

export type SolveEntryAction = { id: number; kind: SolveEntryKind }

export type BacProfile = 'Mate-info' | 'Științe ale naturii' | 'Tehnologic' | 'Pedagogic'
