import { buildFigure } from '../figureBuild'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('buildFigure', () => {
  it('right triangle: legs on the axes, right angle marked, hypotenuse computed', () => {
    const f = buildFigure({ type: 'right_triangle', legs: [3, 4] })!
    expect(f).not.toBeNull()
    expect(f.pts.map((p) => p.name)).toEqual(['A', 'B', 'C'])
    expect(f.segs.length).toBe(3)
    expect(f.rights.length).toBe(1) // right angle at A
    // side lengths match: AB=3, CA=4, BC=hyp=5
    const [A, B, C] = f.pts
    expect(dist(A, B)).toBeCloseTo(3)
    expect(dist(A, C)).toBeCloseTo(4)
    expect(dist(B, C)).toBeCloseTo(5)
  })

  it('triangle by SSS: vertices honor all three side lengths', () => {
    const f = buildFigure({ type: 'triangle', sides: [5, 6, 7] })! // AB, BC, CA
    const [A, B, C] = f.pts
    expect(dist(A, B)).toBeCloseTo(5)
    expect(dist(B, C)).toBeCloseTo(6)
    expect(dist(C, A)).toBeCloseTo(7)
  })

  it('rejects an impossible triangle (violates the triangle inequality)', () => {
    expect(buildFigure({ type: 'triangle', sides: [1, 1, 5] })).toBeNull()
  })

  it('circle: one circle of the given radius + a radius segment', () => {
    const f = buildFigure({ type: 'circle', radius: 4 })!
    expect(f.circles).toEqual([{ cx: 0, cy: 0, r: 4 }])
    expect(f.segs.length).toBe(1)
    expect(f.sideLabels[0].text).toContain('4')
  })

  it('right trapezoid: 4 vertices, right angles on the left side', () => {
    const f = buildFigure({ type: 'trapezoid', bases: [8, 4], height: 3 })!
    expect(f.pts.length).toBe(4)
    expect(f.segs.length).toBe(4)
    expect(f.rights.length).toBe(2)
    const [A, B] = f.pts
    expect(dist(A, B)).toBeCloseTo(8) // bottom base
  })

  it('rectangle: all four right angles', () => {
    const f = buildFigure({ type: 'rectangle', width: 5, height: 2 })!
    expect(f.rights.length).toBe(4)
  })

  it('returns null on unknown or invalid specs', () => {
    expect(buildFigure({ type: 'dodecahedron' })).toBeNull()
    expect(buildFigure({ type: 'right_triangle', legs: [0, 4] })).toBeNull()
    expect(buildFigure(null)).toBeNull()
  })
})
