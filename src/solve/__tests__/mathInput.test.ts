import { plainToLatex, looksLikeProse, isMathInput } from '../mathInput'

describe('looksLikeProse / isMathInput', () => {
  it('word problems are prose', () => {
    expect(looksLikeProse('Ana are 2 mere. Costel are de 10 ori mai multe.')).toBe(true)
    expect(isMathInput('Ana are 2 mere')).toBe(false)
  })

  it('short word problems are still prose', () => {
    expect(looksLikeProse('Am 2 mere')).toBe(true)
  })

  it('expressions are NOT prose, even with function names', () => {
    expect(looksLikeProse('2x^2 + 5x - 3 = 0')).toBe(false)
    expect(looksLikeProse('sqrt(x+1)')).toBe(false)
    expect(looksLikeProse('lim x->0 sin(x)/x')).toBe(false)
    expect(isMathInput('(x+1)/(2x-3)')).toBe(true)
  })

  it('empty input is not math', () => {
    expect(isMathInput('   ')).toBe(false)
  })
})

describe('plainToLatex — fractions', () => {
  it('simple fraction', () => {
    expect(plainToLatex('1/2')).toBe('\\frac{1}{2}')
  })

  it('parenthesised numerator and denominator', () => {
    expect(plainToLatex('(x+1)/(2x-3)')).toBe('\\frac{x+1}{2x-3}')
  })

  it('token operands', () => {
    expect(plainToLatex('a/b + c/d')).toBe('\\frac{a}{b} + \\frac{c}{d}')
  })

  it('exponent stays with its base', () => {
    expect(plainToLatex('x^2/y')).toBe('\\frac{x^{2}}{y}')
  })

  it('nested fractions', () => {
    expect(plainToLatex('(1/2)/x')).toBe('\\frac{\\frac{1}{2}}{x}')
  })

  it('function call as an operand', () => {
    expect(plainToLatex('sqrt(x+1)/2')).toBe('\\frac{\\sqrt{x+1}}{2}')
  })
})

describe('plainToLatex — roots', () => {
  it('sqrt with parens', () => {
    expect(plainToLatex('sqrt(x+1)')).toBe('\\sqrt{x+1}')
  })

  it('unicode root', () => {
    expect(plainToLatex('√(x+1)')).toBe('\\sqrt{x+1}')
  })

  it('bare root operand', () => {
    expect(plainToLatex('√x')).toBe('\\sqrt{x}')
  })

  it('cube root', () => {
    expect(plainToLatex('cbrt(8)')).toBe('\\sqrt[3]{8}')
  })

  it('root inside a fraction, with a fraction inside the root', () => {
    expect(plainToLatex('sqrt(1/2)')).toBe('\\sqrt{\\frac{1}{2}}')
  })
})

describe('plainToLatex — exponents', () => {
  it('single digit', () => {
    expect(plainToLatex('x^2')).toBe('x^{2}')
  })

  it('multi-character exponent in parens', () => {
    expect(plainToLatex('x^(n+1)')).toBe('x^{n+1}')
  })

  it('quadratic', () => {
    expect(plainToLatex('2x^2 + 5x - 3 = 0')).toBe('2x^{2} + 5x - 3 = 0')
  })
})

describe('plainToLatex — symbols & functions', () => {
  it('ascii comparisons', () => {
    expect(plainToLatex('x <= 5')).toBe('x \\leq 5')
    expect(plainToLatex('x != 0')).toBe('x \\neq 0')
  })

  it('star becomes cdot', () => {
    expect(plainToLatex('2*x')).toBe('2 \\cdot x')
  })

  it('unicode symbols map to commands', () => {
    expect(plainToLatex('∫ x dx')).toBe('\\int x dx')
    expect(plainToLatex('π ± 1')).toBe('\\pi \\pm 1')
  })

  it('functions become operators', () => {
    expect(plainToLatex('sin(x)')).toBe('\\sin(x)')
    expect(plainToLatex('ln 2')).toBe('\\ln 2')
  })

  it('the quadratic formula, end to end', () => {
    expect(plainToLatex('x = (-b ± sqrt(b^2 - 4ac))/(2a)')).toBe(
      'x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}',
    )
  })
})

describe('plainToLatex — safety', () => {
  it('empty input', () => {
    expect(plainToLatex('')).toBe('')
  })

  it('an unparseable slash is left alone, not mangled', () => {
    expect(plainToLatex('/x')).toBe('/x')
  })
})
