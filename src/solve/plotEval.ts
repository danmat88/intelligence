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
  /** One or more curves (a system draws several). Each is split into continuous
   *  segments at discontinuities (1/x, tan) so no false vertical line is drawn. */
  curves: { segments: [number, number][][] }[]
  /** Points to mark: x-intercepts (y=0) for a single function, or intersections
   *  (x, y) for a system — each with a display label. */
  marks: { x: number; y: number; label: string }[]
  /** The robust display window on y: blow-ups near poles are clipped out so the
   *  curves' body stays visible (a function with no asymptote is shown in full). */
  yMin: number
  yMax: number
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

type Mark = { x: number; y: number; label: string }

/** Normalize the model's marks: `roots` are x-intercepts (drawn at y=0),
 *  `points` are intersections (x, y given). */
function normMarks(roots: unknown, points: unknown): Mark[] {
  const out: Mark[] = []
  if (Array.isArray(roots)) {
    for (const r of roots) {
      if (typeof r === 'number' && isFinite(r)) out.push({ x: r, y: 0, label: fmt(r) })
      else if (r && typeof r === 'object') {
        const x = Number((r as { x?: unknown }).x)
        if (isFinite(x)) {
          const lbl = (r as { label?: unknown }).label
          out.push({ x, y: 0, label: typeof lbl === 'string' && lbl ? lbl : fmt(x) })
        }
      }
    }
  }
  if (Array.isArray(points)) {
    for (const p of points) {
      if (p && typeof p === 'object') {
        const x = Number((p as { x?: unknown }).x), y = Number((p as { y?: unknown }).y)
        if (isFinite(x) && isFinite(y)) {
          const lbl = (p as { label?: unknown }).label
          out.push({ x, y, label: typeof lbl === 'string' ? lbl : '' })
        }
      }
    }
  }
  return out.slice(0, 8)
}

/**
 * Build the drawable plot from a solve JSON object. Accepts a single function
 * (`plot:{fn, roots?}`), a system (`plot:{curves:[{fn}], points?}`) or the
 * legacy `quadratic:[a,b,c]`. Returns null when nothing plottable compiles.
 */
export function buildPlotPayload(j: Record<string, unknown> | null | undefined): PlotPayload | null {
  if (!j) return null
  let fnStrs: string[] = []
  let marks: Mark[] = []
  let domain: [number, number] | null = null

  const plot = j.plot as
    | { fn?: unknown; curves?: unknown; roots?: unknown; points?: unknown; domain?: unknown }
    | undefined
  if (plot && (Array.isArray(plot.curves) || typeof plot.fn === 'string')) {
    if (Array.isArray(plot.curves)) {
      fnStrs = plot.curves
        .map((c) => (c && typeof (c as { fn?: unknown }).fn === 'string' ? ((c as { fn: string }).fn) : ''))
        .filter(Boolean)
        .slice(0, 3)
    } else if (typeof plot.fn === 'string') {
      fnStrs = [plot.fn]
    }
    marks = normMarks(plot.roots, plot.points)
    if (Array.isArray(plot.domain) && plot.domain.length === 2) {
      const a = Number(plot.domain[0]), b = Number(plot.domain[1])
      if (isFinite(a) && isFinite(b) && b > a) domain = [a, b]
    }
  } else if (Array.isArray(j.quadratic) && j.quadratic.length === 3) {
    const a = Number(j.quadratic[0]), b = Number(j.quadratic[1]), c = Number(j.quadratic[2])
    if (isFinite(a) && a !== 0 && isFinite(b) && isFinite(c)) {
      fnStrs = [`${a}*x^2+${b}*x+${c}`]
      const disc = b * b - 4 * a * c
      if (disc >= 0) {
        const sq = Math.sqrt(disc)
        marks = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)].map((x) => ({ x, y: 0, label: fmt(x) }))
      }
    }
  }
  const fns = fnStrs.map(compile).filter((f): f is Fn => !!f)
  if (!fns.length) return null

  // Domain: given, else centered on the marks, else a sensible default.
  let xmin: number, xmax: number
  if (domain) {
    ;[xmin, xmax] = domain
  } else if (marks.length) {
    const xs = marks.map((m) => m.x)
    const lo = Math.min(...xs), hi = Math.max(...xs)
    const pad = Math.max(1.6, (hi - lo) * 0.45)
    xmin = lo - pad
    xmax = hi + pad
  } else {
    xmin = -6
    xmax = 6
  }

  const N = 160
  const rawCurves: [number, number][][] = fns.map((fn) => {
    const pts: [number, number][] = []
    for (let k = 0; k <= N; k++) {
      const x = xmin + ((xmax - xmin) * k) / N
      const y = fn(x)
      if (isFinite(y)) pts.push([x, y])
    }
    return pts
  })
  const allY = rawCurves.flat().map((p) => p[1])
  if (allY.length < 4) return null

  // Robust y-window across ALL curves + marks: clip pole blow-ups so the body
  // stays visible (a system of well-behaved curves is shown in full).
  const winY = allY.concat(marks.map((m) => m.y))
  const absSorted = winY.map(Math.abs).sort((a, b) => a - b)
  const p90 = absSorted[Math.floor(0.9 * (absSorted.length - 1))] || 1
  const cap = Math.max(p90 * 3, 1e-9)
  let yMax = Math.min(Math.max(...winY), cap)
  let yMin = Math.max(Math.min(...winY), -cap)
  if (yMax - yMin < 1e-6) yMax = yMin + 1
  if (yMin > 0) yMin = -0.2 * yMax
  if (yMax < 0) yMax = -0.2 * yMin
  const padY = (yMax - yMin) * 0.12
  yMin -= padY
  yMax += padY
  const range = yMax - yMin
  const round = (v: number) => Number(v.toFixed(4))

  // Split each curve into continuous segments (break at asymptotes).
  const curves = rawCurves
    .map((raw) => {
      const segsRaw: [number, number][][] = []
      let cur: [number, number][] = []
      for (const p of raw) {
        if (cur.length && Math.abs(p[1] - cur[cur.length - 1][1]) > 1.8 * range) {
          segsRaw.push(cur)
          cur = []
        }
        cur.push(p)
      }
      if (cur.length) segsRaw.push(cur)
      return {
        segments: segsRaw
          .filter((s) => s.length >= 2)
          .map((s) => s.map((p): [number, number] => [round(p[0]), round(p[1])])),
      }
    })
    .filter((c) => c.segments.length)
  if (!curves.length) return null

  return {
    curves,
    marks: marks.map((m) => ({ x: round(m.x), y: round(m.y), label: m.label })),
    yMin: round(yMin),
    yMax: round(yMax),
  }
}
