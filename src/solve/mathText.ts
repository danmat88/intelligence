/**
 * Rescue bare inline math that a model forgot to wrap in $…$.
 *
 * The solution WebView typesets a prose string by handing it to KaTeX
 * auto-render, which only touches $…$-delimited islands. Models are told to
 * wrap inline math (`f(x) = $x^2$`) but frequently emit it bare (`f(x) = x^2`),
 * and a bare `^`/`_` then renders as a literal caret next to an otherwise
 * beautifully typeset solution. This wraps those fragments so they typeset.
 *
 * Deliberately NARROW so it can never mangle prose:
 *   - a "math run" is SPACE-FREE — it can never swallow a sentence;
 *   - it must contain a super/subscript (^ or _) — plain words are never
 *     touched (no Romanian/English word carries a raw ^ or _);
 *   - existing $…$ islands are left exactly as they are (no double-wrapping).
 *
 * MIRROR: an identical `autowrapMath()` lives inline in the ThreadDocument
 * WebView page (it can't import this — the page is a built string, and Hermes
 * strips function source so `.toString()` injection is unavailable). Keep the
 * two in sync; this copy is the tested one.
 */
export function autowrapInlineMath(text: string): string {
  return String(text)
    .split(/(\$[^$]*\$)/)
    .map((part, i) =>
      // odd indices are existing $…$ islands — leave them untouched
      i % 2 === 1
        ? part
        : part.replace(/[A-Za-z0-9)\]}]+(?:[_^](?:\{[^{}]*\}|[A-Za-z0-9]+))+/g, (m) => '$' + m + '$'),
    )
    .join('')
}
