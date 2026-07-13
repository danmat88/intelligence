/**
 * URL sanitizer for model-generated markdown that has already been run through
 * `marked` into HTML. The model's output is HOSTILE input (a photo can carry a
 * prompt-injection payload), and `marked` turns markdown link/image syntax into
 * live HTML that the page's `<`-escaping does NOT catch:
 *   [x](javascript:alert(1))  -> <a href="javascript:alert(1)">
 *   ![](https://evil/beacon)  -> <img src="https://evil/beacon">  (auto-loads)
 *
 * This neutralizes any link whose scheme isn't http(s)/mailto, and drops images
 * outright (a math solution never needs a markdown image; the problem photo is
 * rendered through a separate, non-markdown path).
 *
 * MIRROR: an identical `sanUrl()` lives inline in the ThreadDocument WebView
 * page (it can't import this — Hermes strips function source, so `.toString()`
 * injection is unavailable). Keep the two in sync; this copy is the tested one.
 */
export function sanitizeMarkedHtml(html: string): string {
  return String(html)
    .replace(/(<a\s[^>]*?href=")([^"]*)"/gi, (m, pre, url) =>
      /^(https?:|mailto:)/i.test(String(url).replace(/^\s+/, '')) ? m : pre + '#"',
    )
    .replace(/<img\b[^>]*>/gi, '')
}
