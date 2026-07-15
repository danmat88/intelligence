/**
 * Live daily-usage state, fed by the proxy's X-Daily-Used/X-Daily-Limit
 * response headers (functions/src/gemini.ts sets them on every metered solve).
 * The UI shows it as the "2/5 azi" pill — the cap becomes something you can
 * SEE approaching instead of a surprise wall. Premium users get no headers,
 * so a solve WITHOUT them clears the state (the pill disappears).
 *
 * Counts reset at midnight Europe/Bucharest on the server; `isFromToday`
 * mirrors that so a stale yesterday count is hidden, never shown wrong.
 */

export type DailyUsage = { used: number; limit: number; at: number }

let current: DailyUsage | null = null
const subs = new Set<(u: DailyUsage | null) => void>()

function emit() {
  for (const cb of subs) cb(current)
}

/** A metered solve response arrived — remember and broadcast today's usage. */
export function reportDailyUsage(used: number, limit: number) {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return
  current = { used, limit, at: Date.now() }
  emit()
}

/** A solve response WITHOUT usage headers (premium, or an old proxy) — the
 *  pill must not keep showing a count that no longer applies. Also called on
 *  account switch: the next metered solve repopulates it. */
export function clearDailyUsage() {
  if (current === null) return
  current = null
  emit()
}

/** Subscribe to usage changes; fires immediately with the current value. */
export function subscribeDailyUsage(cb: (u: DailyUsage | null) => void): () => void {
  subs.add(cb)
  cb(current)
  return () => {
    subs.delete(cb)
  }
}

/** True when the timestamp falls on today's calendar day in Bucharest — the
 *  same day boundary the server resets on. */
export function isFromToday(at: number, now = Date.now()): boolean {
  const day = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date(ms))
  return day(at) === day(now)
}
