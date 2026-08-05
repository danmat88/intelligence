import type { NavigatorScreenParams } from '@react-navigation/native'
import type { Problem } from '../solve/store'
import type { PracticeExam } from '../practice/catalog'
import type { PracticeConfig } from '../practice/generator'
import type { NativeOfficialPaper } from '../archive/content'
import type { BacTrack } from '../product/profile'

export type MainDestination = 'Acasa' | 'Exercitii' | 'Biblioteca' | 'Activitate'

export type MainTabParamList = {
  Acasa: undefined
  Exercitii: undefined
  Biblioteca: { section?: 'problems' | 'tests' | 'mistakes' | 'progress' } | undefined
  Activitate: { section?: 'problems' | 'tests' | 'mistakes' | 'progress' } | undefined
}

export type SolveEntryKind = 'camera' | 'library' | 'type'

export type SolveRouteParams = {
  entry?: SolveEntryKind
  problem?: Problem
  initialDraft?: string
}

export type RootStackParamList = {
  Welcome: undefined
  Onboarding: undefined
  Principal: NavigatorScreenParams<MainTabParamList> | undefined
  Rezolva: SolveRouteParams | undefined
  Setari: undefined
  Activitate: {
    exam: PracticeExam
    setId?: string
    config?: PracticeConfig
    bacTrack?: BacTrack
    mode?: 'practice' | 'simulation'
    focusExerciseId?: string
  }
  SubiectOficial: {
    item: NativeOfficialPaper
    mode: 'study' | 'guided' | 'simulation'
  }
}

/** The focused solver route is separate from retained conversation data. */
export type SolverSurface = 'entry' | 'thread'

/** States in which the solver owns system/back behavior or an overlay. */
export type SolverChrome = 'entry' | 'typing' | 'thread' | 'capture' | 'overlay'

export type SolveEntryAction = { id: number; kind: SolveEntryKind }
