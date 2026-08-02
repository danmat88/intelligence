import type { OfficialPaperMode } from './store'

/**
 * A worked solution is never revealed merely because a session was opened.
 * Study and guided sessions may reveal it after an explicit request;
 * simulation keeps it locked until that session is finished.
 */
export function canRevealOfficialSolution(
  mode: OfficialPaperMode,
  explicitlyRequested: boolean,
): boolean {
  return mode !== 'simulation' && explicitlyRequested
}
