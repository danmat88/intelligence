import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// The freemium quantity caps (Dan's decisions 2026-07-15): everyone gets the
// FULL solving experience — full steps, verification, quality — capped only in
// HOW MUCH per day. Guests get a taste, signing in raises it, Premium removes
// it. The counters live here (Admin SDK territory) because a client-side cap
// is decoration: a tampered client simply wouldn't count.
export const DAILY_SOLVES_GUEST = 2
export const DAILY_SOLVES_USER = 5
// Follow-up chat is where learning happens, so it's generous — but NOT
// unlimited, or the chat becomes a side door to unmetered solving ("now solve
// 3x²-7=0" typed into the thread). 10 questions per problem per day.
export const DAILY_CHAT_PER_PROBLEM = 10

/** Calendar day in the app's home market (Romania) — the caps reset at
 *  midnight Bucharest, which is what "revino mâine" means to the user. */
export function dayKey(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(now)
}

export type CapResult = { allowed: boolean; used: number; limit: number }

type DayDoc = { day?: string; problems?: string[]; chat?: Record<string, number> }
type DayState = { problems: string[]; chat: Record<string, number> }

/** Today's usage out of the stored doc — any other day's data resets to zero. */
function todayState(data: DayDoc | undefined, today: string): DayState {
  if (data?.day !== today) return { problems: [], chat: {} }
  return {
    problems: Array.isArray(data.problems) ? data.problems : [],
    chat: data.chat && typeof data.chat === 'object' ? data.chat : {},
  }
}

// expiresAt drives Firestore TTL cleanup (same pattern as rate_limits): every
// key leaves a doc here; TTL erases it two days after the last activity, so
// the collection never grows forever.
function expiry(): Timestamp {
  return Timestamp.fromMillis(Date.now() + 48 * 3600 * 1000)
}

/**
 * SOLVE cap — counts PROBLEMS, not requests. One user-visible solve
 * legitimately fans out into several proxy calls (fast solve, deep escalation,
 * the verifier's re-solve) — so the client tags every solve-path request with
 * the SAME problem id, and the day's usage is a set of distinct ids.
 * Re-requesting a problem already counted today (retry, escalation, correction
 * re-solve) is free; only a NEW id consumes a slot. Transactional, so parallel
 * requests can't slip past the ceiling.
 *
 * `key` is WHO gets metered: signed-in users by uid (the limit is the
 * account's, on every device), guests by INSTALL id (`device_...`) — an
 * anonymous uid is minted fresh on every sign-out, so keying guests by uid
 * would make "log out, get 2 more" an infinite loop. The install id survives
 * sign-out; only a reinstall resets it (acceptable friction, and App Check
 * later hardens the rest).
 */
export async function underDailyCap(key: string, problemId: string, limit: number): Promise<CapResult> {
  const ref = getFirestore().collection('daily_solves').doc(key)
  const today = dayKey()
  return getFirestore().runTransaction(async (tx) => {
    const s = todayState((await tx.get(ref)).data() as DayDoc | undefined, today)
    if (s.problems.includes(problemId)) return { allowed: true, used: s.problems.length, limit }
    if (s.problems.length >= limit) return { allowed: false, used: s.problems.length, limit }
    tx.set(ref, { day: today, problems: [...s.problems, problemId], chat: s.chat, expiresAt: expiry() })
    return { allowed: true, used: s.problems.length + 1, limit }
  })
}

/**
 * CHAT cap — follow-up questions per problem per day, same doc, same reset.
 * Every follow-up carries the problem's id; each one increments that
 * problem's counter until the ceiling.
 */
export async function underChatCap(key: string, problemId: string, limit: number): Promise<CapResult> {
  const ref = getFirestore().collection('daily_solves').doc(key)
  const today = dayKey()
  return getFirestore().runTransaction(async (tx) => {
    const s = todayState((await tx.get(ref)).data() as DayDoc | undefined, today)
    const used = Number(s.chat[problemId] ?? 0)
    if (used >= limit) return { allowed: false, used, limit }
    tx.set(ref, { day: today, problems: s.problems, chat: { ...s.chat, [problemId]: used + 1 }, expiresAt: expiry() })
    return { allowed: true, used: used + 1, limit }
  })
}

/**
 * Premium bypasses the daily caps. The tier lives on users/{uid} and is written
 * ONLY by the Admin SDK (the RevenueCat webhook, or a manual grant) — clients
 * can read it but never write it, so a hacked app can't self-promote.
 * `premiumUntil` is a safety net: if an expiration webhook is ever missed, a
 * lapsed subscription still stops bypassing once its paid period ends.
 */
export async function isPremium(uid: string): Promise<boolean> {
  try {
    const snap = await getFirestore().doc(`users/${uid}`).get()
    const d = snap.data() as { tier?: string; premiumUntil?: Timestamp | null } | undefined
    if (d?.tier !== 'premium') return false
    const until = d.premiumUntil
    return !until || until.toMillis() > Date.now()
  } catch {
    // Firestore hiccup must not hand out free unlimited usage — fall through
    // to the normal cap (the honest user still has their daily solves).
    return false
  }
}
