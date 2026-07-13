import { autowrapInlineMath } from '../mathText'

// Guards the "am citit / problem looks mathematical" fix. The page runs an
// inline mirror of autowrapInlineMath; these lock the intended behavior.
describe('autowrapInlineMath', () => {
  it('wraps the exact bug case (bare superscript in a prose restatement)', () => {
    expect(autowrapInlineMath('f(x) = x^2 · sin(x)')).toBe('f(x) = $x^2$ · sin(x)')
  })

  it('wraps multi-char braced exponents and subscripts', () => {
    expect(autowrapInlineMath('x^{n+1}')).toBe('$x^{n+1}$')
    expect(autowrapInlineMath('a_1 + a_2')).toBe('$a_1$ + $a_2$')
    expect(autowrapInlineMath('x_1^2')).toBe('$x_1^2$')
  })

  it('wraps several runs in one string', () => {
    expect(autowrapInlineMath('x^2 + y^2 = r^2')).toBe('$x^2$ + $y^2$ = $r^2$')
  })

  it('leaves existing $…$ islands untouched (no double-wrapping)', () => {
    expect(autowrapInlineMath('cost is $x^2$ plus z_3')).toBe('cost is $x^2$ plus $z_3$')
    expect(autowrapInlineMath('$a^2 + b^2$')).toBe('$a^2 + b^2$')
  })

  it('never touches plain prose (no ^ or _)', () => {
    const prose = 'Un tren pleacă din gara A cu 60 km/h.'
    expect(autowrapInlineMath(prose)).toBe(prose)
    expect(autowrapInlineMath('Calculați aria triunghiului.')).toBe('Calculați aria triunghiului.')
  })

  it('does not swallow across spaces', () => {
    // the run stops at the space, so surrounding words stay outside the math
    expect(autowrapInlineMath('derivata lui x^2 este simpla')).toBe('derivata lui $x^2$ este simpla')
  })

  it('is a no-op on empty / whitespace', () => {
    expect(autowrapInlineMath('')).toBe('')
    expect(autowrapInlineMath('   ')).toBe('   ')
  })
})
