/**
 * The daily limits, as the client sees them. The proxy answers an over-cap
 * request with 429 + `{ code: 'DAILY_LIMIT'|'CHAT_LIMIT', used, limit, guest }`
 * (functions/src/gemini.ts) — this module recognizes those shapes and turns
 * them into a typed error the UI can act on (open the upsell sheet) instead of
 * a generic "busy" toast. It must NEVER be retried: the answer won't change
 * until tomorrow or until the user upgrades.
 */

export type DailyLimitInfo = {
  /** Which ceiling was hit: solves per day, or chat questions on one problem. */
  kind: 'solve' | 'chat'
  /** Units already used today (problems, or questions on this problem). */
  used: number
  /** Today's ceiling (2 guest / 5 signed-in solves; 10 chat per problem). */
  limit: number
  /** True for anonymous users — the solve upsell leads with "sign in for 5/day". */
  guest: boolean
}

export class DailyLimitError extends Error {
  readonly info: DailyLimitInfo
  constructor(info: DailyLimitInfo) {
    super(`Daily solve limit reached (${info.used}/${info.limit})`)
    this.name = 'DailyLimitError'
    this.info = info
  }
}

/** The proxy's DAILY_LIMIT / CHAT_LIMIT body out of a 429 response's text, or null. */
export function parseDailyLimit(detail: string): DailyLimitInfo | null {
  try {
    const j = JSON.parse(detail) as { code?: string; used?: number; limit?: number; guest?: boolean }
    if (j?.code !== 'DAILY_LIMIT' && j?.code !== 'CHAT_LIMIT') return null
    return {
      kind: j.code === 'CHAT_LIMIT' ? 'chat' : 'solve',
      used: Number(j.used) || 0,
      limit: Number(j.limit) || 0,
      guest: !!j.guest,
    }
  } catch {
    return null
  }
}
