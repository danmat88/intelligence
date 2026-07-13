import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions'
import { getAuth } from 'firebase-admin/auth'
import { wipeUserData } from './account'

/**
 * Weekly guest purge. Every fresh install and every sign-out mints an
 * anonymous auth user; the ones that never came back would otherwise live
 * forever (the rate-limit docs already TTL away — this extends the same
 * hygiene to the accounts themselves and their data). Product decision:
 * a guest untouched for 90 days is gone; anyone who returns sooner finds
 * their work intact. Google-linked accounts are NEVER purged.
 */
const STALE_MS = 90 * 24 * 3600 * 1000
// Deleting a user is ~4 sequential admin calls; cap a run well inside the
// timeout — the backlog just drains over the following weeks.
const MAX_PER_RUN = 300

export const purgeStaleGuests = onSchedule(
  {
    schedule: 'every sunday 04:00',
    timeZone: 'Europe/Bucharest',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '256MiB',
  },
  async () => {
    const cutoff = Date.now() - STALE_MS
    const auth = getAuth()
    let pageToken: string | undefined
    let purged = 0
    let failed = 0
    do {
      const page = await auth.listUsers(1000, pageToken)
      for (const u of page.users) {
        if (purged >= MAX_PER_RUN) break
        if (u.providerData.length > 0) continue // real identity — never purge
        const lastSeen = Math.max(
          Date.parse(u.metadata.lastRefreshTime ?? '') || 0,
          Date.parse(u.metadata.lastSignInTime ?? '') || 0,
          Date.parse(u.metadata.creationTime ?? '') || 0,
        )
        if (lastSeen > cutoff) continue
        try {
          await wipeUserData(u.uid)
          purged++
        } catch (e) {
          // one broken account must not stall the sweep — next run retries it
          failed++
          logger.error(`[purge] failed to purge ${u.uid}`, e)
        }
      }
      pageToken = page.pageToken
    } while (pageToken && purged < MAX_PER_RUN)
    logger.info(`[purge] removed ${purged} stale guest account(s)${failed ? `, ${failed} failed` : ''}`)
  },
)
