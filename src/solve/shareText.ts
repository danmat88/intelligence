/**
 * LaTeX → readable plain text, for Copy/Share of solutions.
 *
 * The model's math fields are LaTeX. Chat apps and clipboards get PLAIN TEXT,
 * so this converts structures properly — including NESTED braces, which the
 * old one-shot regexes could not handle (\frac{2x^2+5x-3}{x+1} used to come
 * out as garbage). Structures are rewritten inside-out until stable.
 */

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', 'n': 'ⁿ',
}

/** Single letters/numbers don't need wrapping parens: (2)/(x+1) → 2/(x+1). */
function group(s: string): string {
  const t = s.trim()
  return /^[a-zA-Z0-9.,·°πθαβγ]+$/.test(t) ? t : `(${t})`
}

function sup(s: string): string {
  const t = s.trim()
  if (t.length === 1 && SUP[t]) return SUP[t]
  return `^(${t})`
}

/** Innermost-first rewriting of brace structures, applied until stable. */
function convertStructures(s: string): string {
  const B = '\\{([^{}]*)\\}' // one brace group with NO nested braces inside
  const passes: [RegExp, (m: string, ...g: string[]) => string][] = [
    [new RegExp('\\\\(?:text|textbf|textit|mathrm|mathbf|mathit|operatorname)' + B, 'g'), (_, a) => a],
    [new RegExp('\\\\frac' + B + B, 'g'), (_, a, b) => `${group(a)}/${group(b)}`],
    [new RegExp('\\\\sqrt\\[([^\\]]*)\\]' + B, 'g'), (_, n, x) => `${n}√(${x.trim()})`],
    [new RegExp('\\\\sqrt' + B, 'g'), (_, x) => `√(${x.trim()})`],
    [new RegExp('\\^' + B, 'g'), (_, x) => sup(x)],
    [new RegExp('_' + B, 'g'), (_, x) => `_${x.trim()}`],
  ]
  let out = s
  for (let guard = 0; guard < 40; guard++) {
    const before = out
    for (const [re, fn] of passes) out = out.replace(re, fn as (...args: string[]) => string)
    if (out === before) break
  }
  return out
}

const SYMBOLS: [RegExp, string][] = [
  [/\\left\s*|\\right\s*|\\!|\\,|\\;|\\:|\\quad|\\qquad/g, ' '],
  [/\\mathbb\{R\}/g, 'ℝ'], [/\\mathbb\{Z\}/g, 'ℤ'], [/\\mathbb\{N\}/g, 'ℕ'],
  [/\\mathbb\{Q\}/g, 'ℚ'], [/\\mathbb\{C\}/g, 'ℂ'],
  [/\\cdot/g, '·'], [/\\times/g, '×'], [/\\div/g, '÷'],
  [/\\pm/g, '±'], [/\\mp/g, '∓'],
  [/\\leqslant|\\leq|\\le\b/g, '≤'], [/\\geqslant|\\geq|\\ge\b/g, '≥'],
  [/\\neq|\\ne\b/g, '≠'], [/\\approx/g, '≈'], [/\\equiv/g, '≡'],
  [/\\infty/g, '∞'], [/\\degree|\^\\circ/g, '°'], [/\\%/g, '%'],
  [/\\pi\b/g, 'π'], [/\\theta\b/g, 'θ'], [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'],
  [/\\gamma\b/g, 'γ'], [/\\delta\b/g, 'δ'], [/\\Delta\b/g, 'Δ'], [/\\lambda\b/g, 'λ'],
  [/\\mu\b/g, 'μ'], [/\\sigma\b/g, 'σ'], [/\\omega\b/g, 'ω'], [/\\phi\b|\\varphi\b/g, 'φ'],
  [/\\sum\b/g, 'Σ'], [/\\prod\b/g, '∏'], [/\\int\b/g, '∫'],
  [/\\Leftrightarrow|\\iff\b/g, '⇔'], [/\\Rightarrow|\\implies\b/g, '⇒'],
  [/\\rightarrow|\\to\b/g, '→'],
  [/\\in\b/g, ' ∈ '], [/\\cup\b/g, ' ∪ '], [/\\cap\b/g, ' ∩ '],
  [/\\subseteq?\b/g, ' ⊂ '], [/\\emptyset|\\varnothing/g, '∅'],
]

export function latexToPlain(src: string): string {
  let s = String(src ?? '')
  s = convertStructures(s)
  for (const [re, to] of SYMBOLS) s = s.replace(re, to)
  return s
    .replace(/\\begin\{[a-zA-Z*]+\}|\\end\{[a-zA-Z*]+\}/g, '')
    .replace(/\\\\/g, '\n') // LaTeX row breaks
    .replace(/(?<![\\&])&/g, ' ') // alignment tabs
    .replace(/\^([0-9n])(?![0-9])/g, (_, d: string) => SUP[d] ?? `^${d}`)
    .replace(/\\([a-zA-Z]+)/g, '$1') // leftover commands: keep the word (sin, ln…)
    .replace(/[{}]/g, '')
    .replace(/\$+/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:)])/g, '$1')
    .trim()
}

/** Markdown prose (follow-up answers) → plain text: bold/headers/backticks out. */
export function markdownToPlain(src: string): string {
  return latexToPlain(
    String(src ?? '')
      .replace(/^#+\s*/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1'),
  )
}

export type ShareLabels = { problem: string; answer: string; signature: string }

/** Flatten a structured solution (or a markdown follow-up) into share-ready text. */
export function solutionShareText(raw: string, labels: ShareLabels): string {
  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s >= 0 && e > s) {
      const j = JSON.parse(raw.slice(s, e + 1)) as {
        error?: string
        problem?: string
        steps?: { math?: string; why?: string }[]
        answer?: string
      }
      if (j.error) return j.error
      if (j.steps || j.answer) {
        const lines: string[] = []
        if (j.problem) lines.push(`${labels.problem}: ${latexToPlain(j.problem)}`, '')
        ;(j.steps ?? []).forEach((st, i) => {
          lines.push(`${i + 1}. ${latexToPlain(st.math ?? '')}`)
          if (st.why) lines.push(`   ${latexToPlain(st.why)}`)
        })
        if (j.answer) lines.push('', `${labels.answer}: ${latexToPlain(j.answer)}`)
        lines.push('', `— ${labels.signature}`)
        return lines.join('\n')
      }
    }
  } catch {
    // not JSON — a markdown follow-up
  }
  return markdownToPlain(raw)
}
