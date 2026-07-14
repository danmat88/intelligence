import { buildNumberLine } from '../numberLine'

describe('buildNumberLine', () => {
  it('a closed bounded interval [1,5]', () => {
    const n = buildNumberLine({ intervals: [{ a: 1, b: 5, openA: false, openB: false }] })!
    expect(n).not.toBeNull()
    expect(n.intervals.length).toBe(1)
    const iv = n.intervals[0]
    expect(iv.a).toBeCloseTo(1)
    expect(iv.b).toBeCloseTo(5)
    expect(iv.openA).toBe(false)
    expect(iv.rayA).toBe(false)
    expect(n.min).toBeLessThan(1)
    expect(n.max).toBeGreaterThan(5)
  })

  it('an open ray x > 2 → open endpoint at 2, ray to the right', () => {
    const n = buildNumberLine({ intervals: [{ a: 2, b: 1000, openA: true, openB: false }], range: [-4, 8] })!
    const iv = n.intervals[0]
    expect(iv.a).toBeCloseTo(2)
    expect(iv.openA).toBe(true)
    expect(iv.b).toBeCloseTo(8) // clamped to the range edge
    expect(iv.rayB).toBe(true) // and flagged as a ray (arrow, not a circle)
  })

  it('accepts the array form [a,b,openA,openB] and marked points', () => {
    const n = buildNumberLine({ intervals: [[-1, 3, false, true]], points: [{ x: 0, label: '0' }] })!
    expect(n.intervals[0].openB).toBe(true)
    expect(n.points).toEqual([{ x: 0, label: '0' }])
  })

  it('builds sensible ticks within the range', () => {
    const n = buildNumberLine({ intervals: [{ a: 1, b: 5, openA: false, openB: false }] })!
    expect(n.ticks.length).toBeGreaterThan(2)
    n.ticks.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(n.min - 1)
      expect(t).toBeLessThanOrEqual(n.max + 1)
    })
  })

  it('returns null when there is nothing to show', () => {
    expect(buildNumberLine({})).toBeNull()
    expect(buildNumberLine(null)).toBeNull()
  })
})
