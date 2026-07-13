/**
 * Plain-typed math → LaTeX, for the composer preview and the problem header.
 *
 * The student types the way they'd type into a calculator — `(x+1)/(2x-3)`,
 * `sqrt(x+1)`, `x^2` — and we turn it into real typeset math. The SAME
 * converter feeds the live preview and the document header, so what you see
 * before sending is exactly what you get after.
 *
 * Word problems are left alone: `looksLikeProse()` decides, and prose is
 * never fed through math mode (KaTeX's math mode eats spaces).
 */

/** Function names that are MATH, not natural-language words. */
const FUNCS = [
  'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'sqrt', 'cbrt', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'log', 'ln', 'lim', 'exp', 'abs', 'min', 'max', 'det', 'mod', 'gcd', 'lcm',
]
const FUNC_RE = new RegExp(`\\b(${FUNCS.join('|')})\\b`, 'gi')

/** Characters that can be part of a bare math token. */
const TOKEN = /[A-Za-z0-9_.πθαβγλμσω∞]/

/**
 * True when the text reads as natural language (a word problem) rather than
 * an expression. Math function names never count as words.
 */
export function looksLikeProse(src: string): boolean {
  const s = String(src ?? '').replace(FUNC_RE, ' ')
  // two consecutive real words, or one 4+ letter word — both mean prose
  return (
    /[A-Za-zĂÂÎȘȚăâîșț]{2,}\s+[A-Za-zĂÂÎȘȚăâîșț]{2,}/.test(s) ||
    /(^|[^\\A-Za-z])[A-Za-zĂÂÎȘȚăâîșț][a-zăâîșț]{3,}/.test(s)
  )
}

/** True when the text is worth typesetting as math (non-empty, not prose). */
export function isMathInput(src: string): boolean {
  const s = String(src ?? '').trim()
  return s.length > 0 && !looksLikeProse(s)
}

function matchRight(s: string, openIdx: number): number {
  let depth = 0
  for (let j = openIdx; j < s.length; j++) {
    if (s[j] === '(') depth++
    else if (s[j] === ')') {
      depth--
      if (depth === 0) return j
    }
  }
  return -1
}

function matchLeft(s: string, closeIdx: number): number {
  let depth = 0
  for (let j = closeIdx; j >= 0; j--) {
    if (s[j] === ')') depth++
    else if (s[j] === '(') {
      depth--
      if (depth === 0) return j
    }
  }
  return -1
}

/** Start index of the operand that ENDS at `end` (exclusive), reading left. */
function operandLeft(s: string, end: number): number {
  let j = end - 1
  while (j >= 0 && s[j] === ' ') j--
  if (j < 0) return -1

  let start: number
  if (s[j] === ')') {
    const open = matchLeft(s, j)
    if (open < 0) return -1
    start = open
    // absorb a function name in front of the group: sqrt(…), sin(…)
    let k = start - 1
    while (k >= 0 && /[A-Za-z]/.test(s[k])) k--
    if (k + 1 < start) start = k + 1
  } else if (TOKEN.test(s[j])) {
    let k = j
    while (k >= 0 && TOKEN.test(s[k])) k--
    start = k + 1
  } else {
    return -1
  }
  // an exponent chain belongs to its base: x^2, x^(n+1)
  if (start - 1 >= 0 && s[start - 1] === '^') {
    const baseStart = operandLeft(s, start - 1)
    if (baseStart >= 0) start = baseStart
  }
  return start
}

/** End index (exclusive) of the operand that STARTS at `start`, reading right. */
function operandRight(s: string, start: number): number {
  let j = start
  while (j < s.length && s[j] === ' ') j++
  if (j >= s.length) return -1

  let end: number
  if (s[j] === '(') {
    const close = matchRight(s, j)
    if (close < 0) return -1
    end = close + 1
  } else if (/[A-Za-z]/.test(s[j])) {
    // a function call reads as one operand: sqrt(x+1)
    let k = j
    while (k < s.length && /[A-Za-z]/.test(s[k])) k++
    if (k < s.length && s[k] === '(') {
      const close = matchRight(s, k)
      if (close < 0) return -1
      end = close + 1
    } else {
      let m = j
      while (m < s.length && TOKEN.test(s[m])) m++
      end = m
    }
  } else if (TOKEN.test(s[j]) || s[j] === '-') {
    let m = j + 1
    while (m < s.length && TOKEN.test(s[m])) m++
    end = m
  } else {
    return -1
  }
  // an exponent belongs to the operand: 2^n, (x+1)^2
  if (end < s.length && s[end] === '^') {
    const expEnd = operandRight(s, end + 1)
    if (expEnd > 0) end = expEnd
  }
  return end
}

function stripOuterParens(s: string): string {
  const t = s.trim()
  if (t.startsWith('(') && matchRight(t, 0) === t.length - 1) return stripOuterParens(t.slice(1, -1))
  return t
}

/** First `/` at paren depth 0 — the division that splits the expression. */
function topLevelSlash(s: string): number {
  let depth = 0
  for (let j = 0; j < s.length; j++) {
    if (s[j] === '(') depth++
    else if (s[j] === ')') depth--
    else if (s[j] === '/' && depth === 0) return j
  }
  return -1
}

/**
 * The converter core. Splits the PLAIN string into pieces (never re-scanning
 * LaTeX it just emitted) and recurses: outermost fraction first, then roots,
 * then exponents. Each piece handed back to conv() is still plain text, which
 * is what keeps the parsing honest.
 */
function conv(src: string): string {
  const s = src
  if (!s) return ''

  // fractions — cut at the OUTERMOST division
  const i = topLevelSlash(s)
  if (i >= 0) {
    const ls = operandLeft(s, i)
    const re = operandRight(s, i + 1)
    if (ls >= 0 && re >= 0) {
      const num = conv(stripOuterParens(s.slice(ls, i)))
      const den = conv(stripOuterParens(s.slice(i + 1, re)))
      return `${conv(s.slice(0, ls))}\\frac{${num}}{${den}}${conv(s.slice(re))}`
    }
    // not a division we can parse (e.g. a stray slash) — leave it be
    return `${conv(s.slice(0, i))}/${conv(s.slice(i + 1))}`
  }

  // roots
  const rm = /(cbrt|sqrt|√)\s*/.exec(s)
  if (rm) {
    const at = rm.index
    const after = at + rm[0].length
    const kind = rm[1] === 'cbrt' ? '[3]' : ''
    let inner = ''
    let end = -1
    if (s[after] === '(') {
      const close = matchRight(s, after)
      if (close > 0) {
        inner = s.slice(after + 1, close)
        end = close + 1
      }
    } else {
      const oe = operandRight(s, after)
      if (oe > 0) {
        inner = s.slice(after, oe)
        end = oe
      }
    }
    if (end > 0) {
      return `${conv(s.slice(0, at))}\\sqrt${kind}{${conv(inner)}}${conv(s.slice(end))}`
    }
  }

  // exponents
  const e = s.indexOf('^')
  if (e >= 0) {
    const end = operandRight(s, e + 1)
    if (end > 0) {
      const body = conv(stripOuterParens(s.slice(e + 1, end)))
      return `${conv(s.slice(0, e))}^{${body}}${conv(s.slice(end))}`
    }
  }

  return s
}

const SYMBOLS: [RegExp, string][] = [
  [/<=/g, ' \\leq '], [/>=/g, ' \\geq '], [/!=/g, ' \\neq '],
  [/->/g, ' \\to '], [/=>/g, ' \\Rightarrow '],
  [/\*/g, ' \\cdot '],
  [/≤/g, ' \\leq '], [/≥/g, ' \\geq '], [/≠/g, ' \\neq '],
  [/±/g, ' \\pm '], [/∓/g, ' \\mp '], [/·/g, ' \\cdot '], [/×/g, ' \\times '],
  [/÷/g, ' \\div '], [/∞/g, ' \\infty '], [/≈/g, ' \\approx '],
  [/π/g, ' \\pi '], [/θ/g, ' \\theta '], [/α/g, ' \\alpha '], [/β/g, ' \\beta '],
  [/γ/g, ' \\gamma '], [/λ/g, ' \\lambda '], [/μ/g, ' \\mu '], [/σ/g, ' \\sigma '],
  [/ω/g, ' \\omega '], [/Δ/g, ' \\Delta '], [/Σ/g, ' \\sum '], [/∫/g, ' \\int '],
  [/∈/g, ' \\in '], [/ℝ/g, ' \\mathbb{R} '], [/ℤ/g, ' \\mathbb{Z} '], [/ℕ/g, ' \\mathbb{N} '],
  [/→/g, ' \\to '], [/⇒/g, ' \\Rightarrow '],
]

/** Names that must NOT become backslash commands: sqrt/cbrt are handled
 *  structurally by conv(), and KaTeX has no \abs or \lcm — emitting them
 *  renders as red error text. They stay plain identifiers instead. */
const NO_COMMAND = new Set(['sqrt', 'cbrt', 'abs', 'lcm'])

/** Bare function names become LaTeX operators (upright, spaced correctly). */
function functions(src: string): string {
  return src.replace(new RegExp(`\\b(${FUNCS.filter((f) => !NO_COMMAND.has(f)).join('|')})\\b`, 'g'), '\\$1')
}

/** Plain typed math → LaTeX. */
export function plainToLatex(src: string): string {
  const raw = String(src ?? '').trim()
  if (!raw) return ''
  let s = conv(raw)
  for (const [re, to] of SYMBOLS) s = s.replace(re, to)
  s = functions(s)
  return s.replace(/\s{2,}/g, ' ').trim()
}
