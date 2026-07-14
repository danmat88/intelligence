/**
 * Safe math-expression evaluator + plot sampler for the function grapher.
 *
 * The model sends a plot as PLAIN TEXT — a function of x ("2x^2+5x-3") and its
 * x-intercepts — never SVG or coordinates (that would reopen the injection hole
 * and models are bad at coordinates anyway). This module compiles the function
 * with a hand-written recursive-descent parser (NO eval / Function — safe) and
 * samples it into points the WebView just draws. Runs on the RN side, so the
 * tested code is what actually renders; the WebView stays a dumb, safe canvas.
 */

export type PlotPayload = {
  /** Sampled [x,y] pairs across the domain (non-finite points dropped). */
  points: [number, number][]
  /** x-intercepts to mark on the axis, with a display label. */
  roots: { x: number; label: string }[]
}

type Fn = (x: number) => number

const FUNCS: Record<string, (n: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  exp: Math.exp, ln: Math.log, log: (x) => Math.log10(x), lg: (x) => Math.log10(x),
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }

/** Compile "2x^2+5x-3" → (x)=>2x²+5x-3, or null if it can't be parsed.
 *  Supports + - * / ^, unary minus, parens, implicit multiplication (2x, 2(x+1),
 *  2sin(x)), the constants pi/e and the functions above. */
export function compile(expr: string): Fn | null {
  const s = String(expr)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[×·∙*]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[{[]/g, '(')
    .replace(/[}\]]/g, ')')
    .replace(/\$/g, '')
  if (!s) return null
  let i = 0
  const peek = () => s[i]
  const eof = () => i >= s.length
  const startsFactor = (ch: string) => /[0-9.a-z(]/.test(ch)

  function parseExpr(): Fn | null {
    let left: Fn | null = parseTerm()
    if (!left) return null
    while (!eof() && (peek() === '+' || peek() === '-')) {
      const op = s[i++]
      const right = parseTerm()
      if (!right) return null
      const l: Fn = left, r: Fn = right
      left = op === '+' ? (x: number) => l(x) + r(x) : (x: number) => l(x) - r(x)
    }
    return left
  }
  function parseTerm(): Fn | null {
    let left: Fn | null = parseUnary()
    if (!left) return null
    for (;;) {
      let op: string
      if (!eof() && (peek() === '*' || peek() === '/')) op = s[i++]
      else if (!eof() && startsFactor(peek())) op = '*' // implicit multiplication
      else break
      const right = parseUnary()
      if (!right) return null
      const l: Fn = left, r: Fn = right
      left = op === '*' ? (x: number) => l(x) * r(x) : (x: number) => l(x) / r(x)
    }
    return left
  }
  function parseUnary(): Fn | null {
    if (!eof() && peek() === '-') { i++; const u = parseUnary(); return u ? (x: number) => -u(x) : null }
    if (!eof() && peek() === '+') { i++; return parseUnary() }
    return parsePower()
  }
  function parsePower(): Fn | null {
    const base = parseAtom()
    if (!base) return null
    if (!eof() && peek() === '^') {
      i++
      const exp = parseUnary() // right-assoc, allows 2^-1 and x^2
      if (!exp) return null
      const b: Fn = base, e: Fn = exp
      return (x: number) => Math.pow(b(x), e(x))
    }
    return base
  }
  function parseAtom(): Fn | null {
    if (eof()) return null
    const c = peek()
    if (c === '(') {
      i++
      const e = parseExpr()
      if (!e || peek() !== ')') return null
      i++
      return e
    }
    if (/[0-9.]/.test(c)) {
      let n = ''
      while (!eof() && /[0-9.]/.test(peek())) n += s[i++]
      const v = parseFloat(n)
      return isNaN(v) ? null : () => v
    }
    if (/[a-z]/.test(c)) {
      let name = ''
      while (!eof() && /[a-z0-9]/.test(peek())) name += s[i++]
      if (name === 'x') return (x: number) => x
      if (name in CONSTS) { const v = CONSTS[name]; return () => v }
      if (name in FUNCS) {
        if (peek() !== '(') return null
        i++
        const arg = parseExpr()
        if (!arg || peek() !== ')') return null
        i++
        const f = FUNCS[name], a: Fn = arg
        return (x: number) => f(a(x))
      }
      return null
    }
    return null
  }

  const fn = parseExpr()
  return fn && eof() ? fn : null
}

function fmt(n: number): string {
  if (!isFinite(n)) return ''
  const r = Math.round(n)
  if (Math.abs(n - r) < 1e-9) return String(r)
  return String(Number(n.toFixed(2)))
}

function normRoots(raw: unknown): { x: number; label: string }[] {
  if (!Array.isArray(raw)) return []
  const out: { x: number; label: string }[] = []
  for (const r of raw) {
    if (typeof r === 'number' && isFinite(r)) out.push({ x: r, label: fmt(r) })
    else if (r && typeof r === 'object') {
      const x = Number((r as { x?: unknown }).x)
      if (isFinite(x)) {
        const lbl = (r as { label?: unknown }).label
        out.push({ x, label: typeof lbl === 'string' && lbl ? lbl : fmt(x) })
      }
    }
  }
  return out.slice(0, 6)
}

/**
 * Build the drawable plot from a solve JSON object. Accepts the general
 * `plot: {fn, roots?, domain?}` shape or the legacy `quadratic: [a,b,c]`.
 * Returns null when there's nothing plottable or the function can't compile.
 */
export function buildPlotPayload(j: Record<string, unknown> | null | undefined): PlotPayload | null {
  if (!j) return null
  let fn: Fn | null = null
  let roots: { x: number; label: string }[] = []
  let domain: [number, number] | null = null

  const plot = j.plot as { fn?: unknown; roots?: unknown; domain?: unknown } | undefined
  if (plot && typeof plot.fn === 'string') {
    fn = compile(plot.fn)
    roots = normRoots(plot.roots)
    if (Array.isArray(plot.domain) && plot.domain.length === 2) {
      const a = Number(plot.domain[0]), b = Number(plot.domain[1])
      if (isFinite(a) && isFinite(b) && b > a) domain = [a, b]
    }
  } else if (Array.isArray(j.quadratic) && j.quadratic.length === 3) {
    const a = Number(j.quadratic[0]), b = Number(j.quadratic[1]), c = Number(j.quadratic[2])
    if (isFinite(a) && a !== 0 && isFinite(b) && isFinite(c)) {
      fn = (x) => a * x * x + b * x + c
      const disc = b * b - 4 * a * c
      if (disc >= 0) {
        const sq = Math.sqrt(disc)
        roots = [{ x: (-b - sq) / (2 * a), label: '' }, { x: (-b + sq) / (2 * a), label: '' }].map((r) => ({
          x: r.x,
          label: fmt(r.x),
        }))
      }
    }
  }
  if (!fn) return null

  // Domain: given, else centered on the roots, else a sensible default.
  let xmin: number, xmax: number
  if (domain) {
    ;[xmin, xmax] = domain
  } else if (roots.length) {
    const rs = roots.map((r) => r.x)
    const lo = Math.min(...rs), hi = Math.max(...rs)
    const pad = Math.max(1.6, (hi - lo) * 0.45)
    xmin = lo - pad
    xmax = hi + pad
  } else {
    xmin = -6
    xmax = 6
  }

  const N = 120
  const points: [number, number][] = []
  for (let k = 0; k <= N; k++) {
    const x = xmin + ((xmax - xmin) * k) / N
    const y = fn(x)
    if (isFinite(y)) points.push([Number(x.toFixed(4)), Number(y.toFixed(4))])
  }
  if (points.length < 4) return null
  return { points, roots }
}
