import { canRevealOfficialSolution } from '../sessionPolicy'

describe('official paper solution policy', () => {
  it.each(['study', 'guided', 'simulation'] as const)(
    'never reveals an answer just by opening %s mode',
    (mode) => {
      expect(canRevealOfficialSolution(mode, false)).toBe(false)
    },
  )

  it('reveals only after an explicit request in study or guided mode', () => {
    expect(canRevealOfficialSolution('study', true)).toBe(true)
    expect(canRevealOfficialSolution('guided', true)).toBe(true)
  })

  it('keeps answers locked during a simulation', () => {
    expect(canRevealOfficialSolution('simulation', true)).toBe(false)
  })
})
