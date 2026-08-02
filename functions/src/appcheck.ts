import { getAppCheck } from 'firebase-admin/app-check'

/** Development rollout is monitor-only. Enforcement is enabled later with an
 * explicit deployment variable, after valid-token metrics are confirmed. */
export const APP_CHECK_ENFORCED = process.env.APPCHECK_ENFORCE === 'true'

export async function hasValidAppCheckToken(header: string | string[] | undefined): Promise<boolean> {
  if (typeof header !== 'string' || !header) return false
  try {
    await getAppCheck().verifyToken(header)
    return true
  } catch {
    return false
  }
}
