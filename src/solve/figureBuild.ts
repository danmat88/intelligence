/**
 * Geometry-figure builder: turns the model's SEMANTIC description (measurements
 * — side lengths, angles, radius) into concrete coordinates the WebView draws.
 *
 * The model is BAD at coordinates and must never send them (nor SVG). It sends
 * facts like {type:"right_triangle", legs:[3,4]}; THIS code computes the vertex
 * positions (law of cosines, etc.) so the figure is always geometrically
 * consistent even if the model misread a number. Runs native-side, tested; the
 * WebView just fits + strokes the primitives (drawFigure).
 */

export type FigureGeom = {
  /** Named vertices in math space (drawFigure fits them to the card). */
  pts: { name: string; x: number; y: number }[]
  /** Edges, as index pairs into pts. */
  segs: [number, number][]
  /** Circles (center + radius, math space). */
  circles: { cx: number; cy: number; r: number }[]
  /** A label sitting at the midpoint of a side (drawFigure nudges it outward). */
  sideLabels: { x: number; y: number; text: string }[]
  /** Right-angle marks: the corner + unit directions along its two edges. */
  rights: { x: number; y: number; ax: number; ay: number; bx: number; by: number }[]
}

function fmt(n: number): string {
  const r = Math.round(n)
  return Math.abs(n - r) < 1e-9 ? String(r) : String(Number(n.toFixed(2)))
}
function toNums(v: unknown): number[] {
  return Array.isArray(v) ? v.map(Number).filter((n) => isFinite(n)) : []
}
function toStrs(v: unknown): string[] {
  return Array.isArray(v) ? v.map((s) => (typeof s === 'string' ? s : '')) : []
}

/** Build a closed polygon figure from vertices, side texts, and which vertices
 *  carry a right angle. */
function polyFig(
  names: string[],
  coords: [number, number][],
  sideTexts: string[],
  rightVerts: number[],
): FigureGeom {
  const pts = names.map((name, i) => ({ name, x: coords[i][0], y: coords[i][1] }))
  const n = pts.length
  const segs: [number, number][] = []
  const sideLabels: FigureGeom['sideLabels'] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    segs.push([i, j])
    const t = sideTexts[i]
    if (t) sideLabels.push({ x: (pts[i].x + pts[j].x) / 2, y: (pts[i].y + pts[j].y) / 2, text: t })
  }
  const rights = rightVerts
    .filter((i) => i >= 0 && i < n)
    .map((i) => {
      const c = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n]
      const ax = prev.x - c.x, ay = prev.y - c.y, al = Math.hypot(ax, ay) || 1
      const bx = next.x - c.x, by = next.y - c.y, bl = Math.hypot(bx, by) || 1
      return { x: c.x, y: c.y, ax: ax / al, ay: ay / al, bx: bx / bl, by: by / bl }
    })
  return { pts, segs, circles: [], sideLabels, rights }
}

/**
 * Build a drawable figure from the model's `figure` spec. Returns null when the
 * type is unknown or the measurements are invalid/inconsistent.
 */
export function buildFigure(spec: Record<string, unknown> | null | undefined): FigureGeom | null {
  if (!spec || typeof spec !== 'object') return null
  const type = String(spec.type ?? '').toLowerCase().replace(/[\s-]/g, '_')
  const names = toStrs(spec.labels)
  const sl = toStrs(spec.sideLabels)

  if (type === 'right_triangle') {
    const legs = toNums(spec.legs)
    if (legs.length < 2 || legs[0] <= 0 || legs[1] <= 0) return null
    const [p, q] = legs
    const v = names.length >= 3 ? names.slice(0, 3) : ['A', 'B', 'C']
    // right angle at A; legs along the axes; hypotenuse BC
    return polyFig(v, [[0, 0], [p, 0], [0, q]], [sl[0] || fmt(p), sl[1] || fmt(Math.hypot(p, q)), sl[2] || fmt(q)], [0])
  }

  if (type === 'triangle') {
    const sides = toNums(spec.sides) // [AB, BC, CA]
    if (sides.length < 3) return null
    const [ab, bc, ca] = sides
    if (ab <= 0 || bc <= 0 || ca <= 0) return null
    if (ab + bc <= ca || ab + ca <= bc || bc + ca <= ab) return null // triangle inequality
    const x = (ca * ca - bc * bc + ab * ab) / (2 * ab)
    const y2 = ca * ca - x * x
    if (y2 < 0) return null
    const y = Math.sqrt(y2)
    const v = names.length >= 3 ? names.slice(0, 3) : ['A', 'B', 'C']
    return polyFig(v, [[0, 0], [ab, 0], [x, y]], [sl[0] || fmt(ab), sl[1] || fmt(bc), sl[2] || fmt(ca)], [])
  }

  if (type === 'rectangle' || type === 'square') {
    let w = Number(spec.width), h = Number(spec.height)
    if (type === 'square') {
      const s = Number(spec.side)
      if (isFinite(s)) { w = s; h = s }
    }
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null
    const v = names.length >= 4 ? names.slice(0, 4) : ['A', 'B', 'C', 'D']
    return polyFig(v, [[0, 0], [w, 0], [w, h], [0, h]], [sl[0] || fmt(w), sl[1] || fmt(h), sl[2] || '', sl[3] || ''], [0, 1, 2, 3])
  }

  if (type === 'trapezoid') {
    const bases = toNums(spec.bases)
    const h = Number(spec.height)
    if (bases.length < 2 || !isFinite(h) || h <= 0 || bases[0] <= 0 || bases[1] <= 0) return null
    const [a, b] = bases // bottom, top — right trapezoid (right angles on the left)
    const v = names.length >= 4 ? names.slice(0, 4) : ['A', 'B', 'C', 'D']
    return polyFig(v, [[0, 0], [a, 0], [b, h], [0, h]], [sl[0] || fmt(a), sl[1] || '', sl[2] || fmt(b), sl[3] || fmt(h)], [0, 3])
  }

  if (type === 'circle') {
    const r = Number(spec.radius)
    if (!isFinite(r) || r <= 0) return null
    const center = names[0] || 'O'
    return {
      pts: [{ name: center, x: 0, y: 0 }, { name: '', x: r, y: 0 }],
      segs: [[0, 1]], // radius
      circles: [{ cx: 0, cy: 0, r }],
      sideLabels: [{ x: r / 2, y: 0, text: sl[0] || 'r=' + fmt(r) }],
      rights: [],
    }
  }

  return null
}
