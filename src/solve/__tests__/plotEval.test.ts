import { compile, buildPlotPayload } from '../plotEval'

const at = (expr: string, x: number) => {
  const f = compile(expr)
  if (!f) throw new Error(`failed to compile: ${expr}`)
  return f(x)
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

describe('compile — safe expression parser', () => {
  it('basic arithmetic and precedence', () => {
    expect(at('2+3*4', 0)).toBe(14)
    expect(at('(2+3)*4', 0)).toBe(20)
    expect(at('10-2-3', 0)).toBe(5) // left-assoc
    expect(at('12/2/3', 0)).toBe(2)
  })

  it('the variable x and powers', () => {
    expect(at('x^2', 3)).toBe(9)
    expect(at('x^2+5*x-3', 2)).toBe(11)
    expect(near(at('2^3^2', 0), 512)).toBe(true) // right-assoc: 2^(3^2)
    expect(at('x^-1', 4)).toBe(0.25)
  })

  it('implicit multiplication (the way models write it)', () => {
    expect(at('2x', 5)).toBe(10)
    expect(at('2x^2+5x-3', 2)).toBe(15) // 2*4 + 5*2 - 3
    expect(at('2(x+1)', 3)).toBe(8)
    expect(at('3x(x-1)', 2)).toBe(6) // 3 * 2 * (2-1) = 6
  })

  it('unary minus', () => {
    expect(at('-x^2', 3)).toBe(-9)
    expect(at('-(x+1)', 2)).toBe(-3)
    expect(at('2*-3', 0)).toBe(-6)
  })

  it('functions and constants', () => {
    expect(near(at('sin(x)', Math.PI / 2), 1)).toBe(true)
    expect(near(at('cos(0)', 0), 1)).toBe(true)
    expect(near(at('sqrt(x)', 16), 4)).toBe(true)
    expect(near(at('abs(x)', -5), 5)).toBe(true)
    expect(near(at('exp(0)', 0), 1)).toBe(true)
    expect(near(at('ln(e)', 0), 1)).toBe(true)
    expect(near(at('pi', 0), Math.PI)).toBe(true)
    expect(near(at('2pi', 0), 2 * Math.PI)).toBe(true)
  })

  it('normalizes unicode operators and braces', () => {
    expect(at('2×x', 3)).toBe(6)
    expect(at('x−1', 5)).toBe(4)
    expect(at('x^{2}', 3)).toBe(9)
  })

  it('returns null on garbage (graceful → no graph)', () => {
    expect(compile('')).toBeNull()
    expect(compile('2 +')).toBeNull()
    expect(compile('sin(')).toBeNull()
    expect(compile('x^^2')).toBeNull()
    expect(compile('\\frac{1}{x}')).toBeNull() // LaTeX not supported
    expect(compile('foobar(x)')).toBeNull()
  })

  it('non-finite results are produced (caller filters them)', () => {
    const f = compile('sqrt(x)')!
    expect(Number.isNaN(f(-1))).toBe(true)
    const g = compile('1/x')!
    expect(g(0)).toBe(Infinity)
  })
})

describe('buildPlotPayload', () => {
  it('builds points + roots from a plot spec', () => {
    const p = buildPlotPayload({ plot: { fn: '2x^2+5x-3', roots: [{ x: 0.5, label: '½' }, { x: -3, label: '−3' }] } })
    expect(p).not.toBeNull()
    expect(p!.points.length).toBeGreaterThan(50)
    expect(p!.roots).toEqual([{ x: 0.5, label: '½' }, { x: -3, label: '−3' }])
    // a sampled point actually lies on the parabola (points rounded to 4dp)
    const [x, y] = p!.points[10]
    expect(Math.abs(y - (2 * x * x + 5 * x - 3))).toBeLessThan(0.01)
  })

  it('accepts plain-number roots and a given domain', () => {
    const p = buildPlotPayload({ plot: { fn: 'x', roots: [0], domain: [-2, 2] } })
    expect(p!.roots).toEqual([{ x: 0, label: '0' }])
    expect(p!.points[0][0]).toBeCloseTo(-2)
    expect(p!.points[p!.points.length - 1][0]).toBeCloseTo(2)
  })

  it('supports the legacy quadratic:[a,b,c] shape', () => {
    const p = buildPlotPayload({ quadratic: [2, 5, -3] })
    expect(p).not.toBeNull()
    const rx = p!.roots.map((r) => r.x).sort((a, b) => a - b)
    expect(rx[0]).toBeCloseTo(-3)
    expect(rx[1]).toBeCloseTo(0.5)
  })

  it('returns null when there is nothing plottable', () => {
    expect(buildPlotPayload({ answer: 'x=1' })).toBeNull()
    expect(buildPlotPayload({ plot: { fn: '\\sqrt{x}' } })).toBeNull() // uncompilable
    expect(buildPlotPayload(null)).toBeNull()
  })
})
