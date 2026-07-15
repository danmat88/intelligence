import { DailyLimitError, parseDailyLimit } from '../limits'

// The DAILY_LIMIT/CHAT_LIMIT contract between the proxy (functions/src/
// gemini.ts) and the client: a 429 whose body carries one of those codes must
// become a typed error (opens the upsell sheet, with the right variant), and
// everything else must stay a generic failure (retry/busy path). A misparse in
// either direction shows the wrong UI.
describe('parseDailyLimit', () => {
  test('recognizes the proxy DAILY_LIMIT body as a solve limit', () => {
    const body = JSON.stringify({ error: 'Daily solve limit reached.', code: 'DAILY_LIMIT', used: 2, limit: 2, guest: true })
    expect(parseDailyLimit(body)).toEqual({ kind: 'solve', used: 2, limit: 2, guest: true })
  })

  test('recognizes the proxy CHAT_LIMIT body as a chat limit', () => {
    const body = JSON.stringify({ error: 'Daily chat limit reached for this problem.', code: 'CHAT_LIMIT', used: 10, limit: 10, guest: false })
    expect(parseDailyLimit(body)).toEqual({ kind: 'chat', used: 10, limit: 10, guest: false })
  })

  test('signed-in shape (guest false) survives the round trip', () => {
    const body = JSON.stringify({ error: 'x', code: 'DAILY_LIMIT', used: 5, limit: 5, guest: false })
    expect(parseDailyLimit(body)).toEqual({ kind: 'solve', used: 5, limit: 5, guest: false })
  })

  test('an ordinary rate-limit 429 body is NOT a daily limit', () => {
    expect(parseDailyLimit(JSON.stringify({ error: 'Too many requests - please wait a moment.' }))).toBeNull()
  })

  test('non-JSON bodies (Gemini SSE error text, HTML) never throw', () => {
    expect(parseDailyLimit('')).toBeNull()
    expect(parseDailyLimit('<html>502</html>')).toBeNull()
    expect(parseDailyLimit('data: {"candidates":[]}')).toBeNull()
  })

  test('missing numeric fields degrade to zeros, not NaN', () => {
    expect(parseDailyLimit(JSON.stringify({ code: 'DAILY_LIMIT' }))).toEqual({ kind: 'solve', used: 0, limit: 0, guest: false })
  })
})

describe('DailyLimitError', () => {
  test('is an Error and carries the info for the upsell sheet', () => {
    const e = new DailyLimitError({ kind: 'solve', used: 2, limit: 2, guest: true })
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(DailyLimitError)
    expect(e.info).toEqual({ kind: 'solve', used: 2, limit: 2, guest: true })
    expect(e.name).toBe('DailyLimitError')
  })
})
