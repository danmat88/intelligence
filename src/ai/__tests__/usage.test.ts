import { reportDailyUsage, clearDailyUsage, subscribeDailyUsage, isFromToday } from '../usage'

// The usage store feeds the "2/5 azi" pill from the proxy's response headers.
// Contract: subscribers get the current value immediately, updates broadcast,
// clearing hides the pill, and garbage numbers never poison the state.
describe('daily usage store', () => {
  afterEach(() => clearDailyUsage())

  test('subscribe fires immediately and on every report', () => {
    const seen: (number | null)[] = []
    const unsub = subscribeDailyUsage((u) => seen.push(u ? u.used : null))
    reportDailyUsage(1, 5)
    reportDailyUsage(2, 5)
    unsub()
    reportDailyUsage(3, 5) // after unsubscribe — must not arrive
    expect(seen).toEqual([null, 1, 2])
  })

  test('clear broadcasts null (the pill disappears)', () => {
    reportDailyUsage(2, 2)
    const seen: (number | null)[] = []
    const unsub = subscribeDailyUsage((u) => seen.push(u ? u.used : null))
    clearDailyUsage()
    unsub()
    expect(seen).toEqual([2, null])
  })

  test('garbage numbers are ignored, valid state survives', () => {
    reportDailyUsage(1, 5)
    reportDailyUsage(NaN, 5)
    reportDailyUsage(2, 0)
    let latest: number | null = null
    subscribeDailyUsage((u) => (latest = u ? u.used : null))()
    expect(latest).toBe(1)
  })

  test('isFromToday matches the Bucharest day boundary', () => {
    const now = Date.now()
    expect(isFromToday(now, now)).toBe(true)
    expect(isFromToday(now - 26 * 3600 * 1000, now)).toBe(false) // >1 day ago is never today
  })
})
