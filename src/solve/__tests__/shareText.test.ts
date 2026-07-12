import { latexToPlain, markdownToPlain, solutionShareText } from '../shareText'

const LABELS = { problem: 'Problema', answer: 'Răspuns', signature: 'Rezolvat cu Rezolvo' }

describe('latexToPlain', () => {
  it('converts a simple fraction', () => {
    expect(latexToPlain('\\frac{1}{2}')).toBe('1/2')
  })

  it('parenthesizes multi-term numerators/denominators', () => {
    expect(latexToPlain('\\frac{2x^2+5x-3}{x+1}')).toBe('(2x²+5x-3)/(x+1)')
  })

  it('handles NESTED fractions (the old regex garbage case)', () => {
    expect(latexToPlain('\\frac{\\frac{1}{2}}{x}')).toBe('(1/2)/x')
  })

  it('handles roots, including indexed ones', () => {
    expect(latexToPlain('\\sqrt{x+1}')).toBe('√(x+1)')
    expect(latexToPlain('\\sqrt[3]{8}')).toBe('3√(8)')
    expect(latexToPlain('\\frac{\\sqrt{x+1}}{2}')).toBe('(√(x+1))/2')
  })

  it('renders superscripts readably', () => {
    expect(latexToPlain('x^{2}+y^2')).toBe('x²+y²')
    expect(latexToPlain('x^{n+1}')).toBe('x^(n+1)')
  })

  it('drops \\left/\\right and keeps parens', () => {
    expect(latexToPlain('\\left(x+1\\right)^2')).toBe('(x+1)²')
  })

  it('maps common symbols and sets', () => {
    expect(latexToPlain('x \\in \\mathbb{R}, x \\neq 0')).toBe('x ∈ ℝ, x ≠ 0')
    expect(latexToPlain('a \\cdot b \\leq c \\implies d')).toBe('a · b ≤ c ⇒ d')
  })

  it('keeps function names readable', () => {
    expect(latexToPlain('\\sin x + \\ln 2')).toBe('sin x + ln 2')
  })

  it('unwraps \\text and friends', () => {
    expect(latexToPlain('x = 2 \\text{ mere}')).toBe('x = 2 mere')
  })
})

describe('markdownToPlain', () => {
  it('strips markdown and converts inline math', () => {
    expect(markdownToPlain('**Deci** rezultatul este $x^2 = 4$.')).toBe('Deci rezultatul este x² = 4.')
  })
})

describe('solutionShareText', () => {
  it('formats a structured solution with problem, steps, answer, signature', () => {
    const raw = JSON.stringify({
      problem: '2x^2+5x-3=0',
      steps: [
        { math: '\\frac{-5 \\pm \\sqrt{49}}{4}', why: 'Formula pentru \\Delta' },
        { math: 'x_1 = \\frac{1}{2}' },
      ],
      answer: 'x_1 = \\frac{1}{2}, x_2 = -3',
    })
    const out = solutionShareText(raw, LABELS)
    expect(out).toBe(
      [
        'Problema: 2x²+5x-3=0',
        '',
        '1. (-5 ± √(49))/4',
        '   Formula pentru Δ',
        '2. x_1 = 1/2',
        '',
        'Răspuns: x_1 = 1/2, x_2 = -3',
        '',
        '— Rezolvat cu Rezolvo',
      ].join('\n'),
    )
  })

  it('passes the error message through for non-math results', () => {
    expect(solutionShareText('{"error":"Nu văd o problemă în poză."}', LABELS)).toBe('Nu văd o problemă în poză.')
  })

  it('flattens markdown follow-ups', () => {
    expect(solutionShareText('Pasul 2 înseamnă **împărțire** la $x+1$.', LABELS)).toBe(
      'Pasul 2 înseamnă împărțire la x+1.',
    )
  })
})
