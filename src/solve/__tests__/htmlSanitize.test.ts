import { sanitizeMarkedHtml } from '../htmlSanitize'

// These lock the WebView's markdown-injection defense. The strings here are
// exactly what `marked` emits for the corresponding markdown (verified against
// marked 12.0.2), so the test guards the real behavior even though the page
// runs its own inline mirror of this function.
describe('sanitizeMarkedHtml', () => {
  it('neutralizes javascript: links', () => {
    const out = sanitizeMarkedHtml('<p><a href="javascript:alert(document.cookie)">tap</a></p>')
    expect(out).not.toMatch(/javascript:/i)
    expect(out).toContain('href="#"')
    expect(out).toContain('tap') // link TEXT is preserved, only the href dies
  })

  it('neutralizes data: links (data:text/html script payloads)', () => {
    const out = sanitizeMarkedHtml('<p><a href="data:text/html,&lt;script&gt;alert(1)">x</a></p>')
    expect(out).not.toMatch(/data:/i)
    expect(out).toContain('href="#"')
  })

  it('neutralizes scheme tricks (case, leading whitespace, vbscript)', () => {
    expect(sanitizeMarkedHtml('<a href="JavaScript:alert(1)">x</a>')).not.toMatch(/javascript:/i)
    expect(sanitizeMarkedHtml('<a href="  javascript:alert(1)">x</a>')).toContain('href="#"')
    expect(sanitizeMarkedHtml('<a href="vbscript:msgbox(1)">x</a>')).toContain('href="#"')
  })

  it('drops images entirely (no auto-loading beacon requests)', () => {
    expect(sanitizeMarkedHtml('<p><img src="https://evil.example.com/beacon?leak=1" alt=""></p>')).toBe('<p></p>')
    expect(sanitizeMarkedHtml('<img src="file:///etc/passwd">')).toBe('')
  })

  it('preserves legitimate http(s) and mailto links', () => {
    const url = '<p><a href="https://en.wikipedia.org/wiki/Quadratic">wiki</a></p>'
    expect(sanitizeMarkedHtml(url)).toBe(url)
    const mail = '<a href="mailto:help@example.com">contact</a>'
    expect(sanitizeMarkedHtml(mail)).toBe(mail)
  })

  it('leaves ordinary formatting untouched', () => {
    const html = '<p>The answer is <strong>x = 1/2</strong> and <em>y = 3</em>.</p>'
    expect(sanitizeMarkedHtml(html)).toBe(html)
  })

  it('handles multiple links in one blob', () => {
    const out = sanitizeMarkedHtml(
      '<a href="javascript:a()">a</a><a href="https://ok.com">b</a><a href="data:x">c</a>',
    )
    expect(out).toBe('<a href="#">a</a><a href="https://ok.com">b</a><a href="#">c</a>')
  })
})
