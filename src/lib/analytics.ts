import { getAnalytics, logEvent } from '@react-native-firebase/analytics'

/**
 * One-line product telemetry: `track('limit_hit', { kind: 'solve' })`.
 * Telemetry must NEVER break the app — every failure path (native module not
 * in this build yet, analytics disabled, bad params) is swallowed. Event
 * names: snake_case, ≤40 chars, [a-z0-9_] — Firebase drops anything else.
 *
 * The event vocabulary (keep it lean — every event answers a real question):
 *   solve_start {source}        · does anyone type, or is it all camera?
 *   solve_done / solve_error    · how often do we deliver?
 *   chat_send                   · is the follow-up chat used at all?
 *   verify_result {verdict}     · how often is the badge earned?
 *   limit_hit {kind, guest}     · how hard does the cap bite?
 *   paywall_view / purchase_attempt {plan} · does the funnel move?
 *   sign_in_linked              · guest → Google conversion
 *   share {kind}                · organic spread
 *   content_report {problem}    · user flagged AI output (Play AI-content policy)
 */
export function track(name: string, params?: Record<string, string | number | boolean>) {
  try {
    void logEvent(getAnalytics(), name, params).catch(() => {})
  } catch {
    // native module absent (old build) or analytics unavailable — never fatal
  }
}
