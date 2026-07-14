/**
 * Number-line builder for 1D solution sets (linear / absolute-value / interval
 * inequalities). The model sends the solution as intervals + points; this
 * normalizes them, picks a range, and flags unbounded ends as rays. Runs
 * native-side (tested); the WebView's drawNumberLine just strokes it.
 */

export type NLInterval = {
  a: number
  b: number
  /** Strict endpoint (hollow circle) vs closed (filled). */
  openA: boolean
  openB: boolean
  /** Endpoint runs off to ±infinity — draw an arrow, not a circle. */
  rayA: boolean
  rayB: boolean
}

export type NumberLinePayload = {
  min: number
  max: number
  ticks: number[]
  intervals: NLInterval[]
  points: { x: number; label: string }[]
}

function fmt(n: number): string {
  const r = Math.round(n)
  return Math.abs(n - r) < 1e-9 ? String(r) : String(Number(n.toFixed(2)))
}
function niceStep(raw: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(raw > 0 ? raw : 1)))
  const f = raw / p
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p
}
const round = (v: number) => Number(v.toFixed(4))
const INF = 1e4 // treat |value| >= this as "infinity" for ranging

export function buildNumberLine(spec: Record<string, unknown> | null | undefined): NumberLinePayload | null {
  if (!spec || typeof spec !== 'object') return null

  const parsed: { a: number; b: number; openA: boolean; openB: boolean }[] = []
  if (Array.isArray(spec.intervals)) {
    for (const iv of spec.intervals) {
      let a: number, b: number, openA = false, openB = false
      if (Array.isArray(iv)) {
        a = Number(iv[0]); b = Number(iv[1]); openA = !!iv[2]; openB = !!iv[3]
      } else if (iv && typeof iv === 'object') {
        const o = iv as { a?: unknown; b?: unknown; openA?: unknown; openB?: unknown }
        a = Number(o.a); b = Number(o.b); openA = !!o.openA; openB = !!o.openB
      } else continue
      if (isFinite(a) && isFinite(b)) parsed.push({ a: Math.min(a, b), b: Math.max(a, b), openA, openB })
    }
  }

  const points: { x: number; label: string }[] = []
  if (Array.isArray(spec.points)) {
    for (const p of spec.points) {
      if (typeof p === 'number' && isFinite(p)) points.push({ x: p, label: fmt(p) })
      else if (p && typeof p === 'object') {
        const x = Number((p as { x?: unknown }).x)
        if (isFinite(x)) {
          const l = (p as { label?: unknown }).label
          points.push({ x, label: typeof l === 'string' && l ? l : fmt(x) })
        }
      }
    }
  }
  if (!parsed.length && !points.length) return null

  // Range: given, else derived from the finite (non-infinity) coordinates.
  let min: number, max: number
  const rng = spec.range
  if (Array.isArray(rng) && rng.length === 2 && isFinite(Number(rng[0])) && isFinite(Number(rng[1]))) {
    min = Number(rng[0]); max = Number(rng[1])
  } else {
    const vals: number[] = []
    for (const iv of parsed) {
      if (Math.abs(iv.a) < INF) vals.push(iv.a)
      if (Math.abs(iv.b) < INF) vals.push(iv.b)
    }
    for (const p of points) vals.push(p.x)
    if (!vals.length) {
      min = -5; max = 5
    } else {
      const lo = Math.min(...vals), hi = Math.max(...vals)
      const pad = Math.max(2, hi - lo) * 0.35 + 1
      min = lo - pad; max = hi + pad
    }
  }
  if (max <= min) max = min + 1

  const intervals: NLInterval[] = parsed
    .map((iv) => ({
      a: Math.max(min, iv.a),
      b: Math.min(max, iv.b),
      openA: iv.openA,
      openB: iv.openB,
      rayA: iv.a < min,
      rayB: iv.b > max,
    }))
    .filter((iv) => iv.b > iv.a - 1e-9)

  const step = niceStep((max - min) / 6)
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) ticks.push(round(t))

  return {
    min: round(min),
    max: round(max),
    ticks,
    intervals: intervals.map((iv) => ({ ...iv, a: round(iv.a), b: round(iv.b) })),
    points: points.map((p) => ({ x: round(p.x), label: p.label })),
  }
}
