import { extractSSE } from '../gemini'

/** Build one Gemini SSE `data:` line carrying the given text parts. */
const sse = (...texts: string[]) =>
  `data: ${JSON.stringify({ candidates: [{ content: { parts: texts.map((t) => ({ text: t })) } }] })}`

describe('extractSSE', () => {
  it('extracts the text of a single data line', () => {
    expect(extractSSE(sse('Hello'))).toBe('Hello')
  })

  it('concatenates multiple data lines in order', () => {
    expect(extractSSE([sse('Hel'), sse('lo '), sse('world')].join('\n'))).toBe('Hello world')
  })

  it('joins multiple parts within one chunk', () => {
    expect(extractSSE(sse('A', 'B'))).toBe('AB')
  })

  it('ignores non-data lines, blanks and [DONE]', () => {
    const raw = [': keepalive', '', sse('ok'), 'data: [DONE]', 'event: end'].join('\n')
    expect(extractSSE(raw)).toBe('ok')
  })

  it('skips partial/broken JSON without throwing and without losing prior text', () => {
    const raw = [sse('keep'), 'data: {"candidates":[{"content":{"par'].join('\n')
    expect(extractSSE(raw)).toBe('keep')
  })

  it('handles chunks with no candidates gracefully', () => {
    expect(extractSSE('data: {"usageMetadata":{"totalTokenCount":5}}')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(extractSSE('')).toBe('')
  })
})
