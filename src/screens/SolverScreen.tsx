import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import ReAnimated, { Easing as REasing, withTiming, type EntryAnimationsValues } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import SolverSourcePicker from '../features/solver/input/SolverSourcePicker'
import TypedProblemEditor from '../features/solver/input/TypedProblemEditor'
import CrossFade from '../components/ui/CrossFade'
import Press from '../components/ui/Press'
import ScreenBackground from '../components/ui/ScreenBackground'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'
import InfoDialog from '../components/ui/InfoDialog'
import ThreadDocument, { type DocLabels } from '../components/ui/ThreadDocument'
import SymbolBar, { type MathKey } from '../components/ui/SymbolBar'
import MathPreview from '../components/ui/MathPreview'
import ContextHeader from '../components/ui/ContextHeader'
import RezIcon from '../components/ui/RezIcon'
import ScreenContent, { APP_CONTENT_MAX_WIDTH } from '../components/ui/ScreenContent'
import type { SolveEntryAction, SolverChrome, SolverSurface } from '../navigation/types'
import { isMathInput, plainToLatex } from '../solve/mathInput'
import type { CapturedImage } from '../solve/capture'
import { solveImage, solveProblem, followUp, solveDeep, verifyAnswer } from '../solve/solve'
import { CORRECTION_HINT } from '../solve/prompt'
import { latexToPlain, solutionShareText } from '../solve/shareText'
import { getSolveJson, isAbstractProof, isStructuredSolution, withJsonFlags } from '../solve/verdict'
import type { ChatTurn } from '../ai/types'
import { DailyLimitError } from '../ai/limits'
import { subscribeDailyUsage, clearDailyUsage, isFromToday, type DailyUsage } from '../ai/usage'
import { useI18n, type StringKey } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { newProblemId, writeProblem, removeProblem, toStoredTurns, type Problem } from '../solve/store'
import { reportNonFatal } from '../lib/report'
import { useOnline } from '../lib/connectivity'
import { track } from '../lib/analytics'
import { uploadProblemImage, deleteProblemImages, saveLocalCopy, resolveImageUri } from '../solve/imageStore'
import CaptureScreen from './CaptureScreen'
import LimitSheet from './LimitSheet'

type Turn = {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Local file for the just-taken photo, or the cloud URL when loaded. */
  imageUri?: string
  /** Firebase Storage object + tokened URL once the parallel upload lands. */
  imagePath?: string
  imageUrl?: string
  /** Photo dimensions, so the document reserves the exact box up front. */
  imageW?: number
  imageH?: number
  pending?: boolean
  error?: boolean
}

let counter = 0
const uid = () => `${Date.now()}_${counter++}`

/** Pull the topic label out of a structured (JSON) solution, if present. */
function extractTopic(thread: { role: string; text: string }[]): string | null {
  const a = thread.find((t) => t.role === 'assistant' && t.text)
  const topic = a ? getSolveJson(a.text)?.topic : null
  return typeof topic === 'string' ? topic : null
}

/** The message of a {"error": ...} solve response (non-math / unreadable), or null. */
function errorResultMessage(text: string): string | null {
  const err = getSolveJson(text)?.error
  return typeof err === 'string' ? err : null
}

type T = (key: StringKey, vars?: Record<string, string | number>) => string

type SolverScreenProps = {
  entryAction?: SolveEntryAction | null
  initialProblem?: Problem | null
  initialDraft?: string
  onEntryActionHandled?: () => void
  onChromeChange?: (chrome: SolverChrome) => void
  surface: SolverSurface
  onOpenThread: () => void
  onShowEntry: () => void
  onExit: () => void
}

/** Map a raw error to a calm, human message (localized via `t`). */
function friendlyError(e: unknown, t: T): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (/network|failed to fetch|timeout|timed out/i.test(raw)) return t('err.network')
  if (/\b429\b|rate|quota|exhausted|resource_exhausted/i.test(raw)) return t('err.busy')
  // 403 = the AI service refusing us (billing/permissions upstream), NOT the user's login.
  if (/\b403\b|permission.?denied|dunning/i.test(raw)) return t('err.unavailable')
  if (/\b401\b|not signed in|unauthenticated/i.test(raw)) return t('err.auth')
  if (/\b50\d\b|unavailable|overloaded|high demand/i.test(raw)) return t('err.busy')
  return t('err.generic')
}

// LaTeX → readable plain text for Copy/Share lives in solve/shareText.ts
// (real nested-brace conversion, unit-tested — the old regexes here produced
// garbage on any nested structure).

/**
 * The whole app for signed-in users: a conversational math solver. Send a
 * problem (photo or text) and get it worked out step by step; ask short
 * follow-ups about it. One thread = one problem (kept intentionally short so the
 * model stays accurate). "New" starts a fresh problem.
 */
export default function SolverScreen({
  entryAction,
  initialProblem,
  initialDraft,
  onEntryActionHandled,
  onChromeChange,
  surface,
  onOpenThread,
  onShowEntry,
  onExit,
}: SolverScreenProps) {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { user, signIn, error: authError, carried, clearCarried } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const [thread, setThread] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // The daily-cap upsell (server said DAILY_LIMIT/CHAT_LIMIT) and the paywall.
  const [limitHit, setLimitHit] = useState<{ kind: 'solve' | 'chat'; limit: number; guest: boolean } | null>(null)
  // Today's metered usage ("2/5 azi" pill) — fed by the proxy's response
  // headers via src/ai/usage. Null until the first metered solve (or premium).
  const [usage, setUsage] = useState<DailyUsage | null>(null)
  // The in-app capture flow (camera visor / gallery pick + trim).
  const [capture, setCapture] = useState<'camera' | 'library' | null>(null)
  // Turn-ids being machine-checked right now, with their stage: 'check' =
  // first pass, 'recheck' = the honest "re-solving carefully" beat while the
  // deep model recomputes a failed answer.
  const [verifyingMap, setVerifyingMap] = useState<Record<string, 'check' | 'recheck'>>({})
  // Trust explainer opened by tapping the ✓/! badge on an answer box.
  const [verifyInfo, setVerifyInfo] = useState(false)
  const inputRef = useRef<TextInput>(null)
  const threadRef = useRef<Turn[]>([])
  const problemIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // The background verification's own kill switch — separate from the solve's.
  const verifyAbortRef = useRef<AbortController | null>(null)
  const prevUidRef = useRef<string | undefined>(user?.id)
  // Whether the current document shows a LOADED conversation (renders all at
  // once, no entrances) vs a live one (new blocks reveal). The page handles
  // scroll (top for reading, follow for live) internally.
  const coldDocRef = useRef(false)
  // The last request, kept so a failed turn can be retried without retyping.
  const lastReqRef = useRef<{
    userTurn: Turn
    solver: (s: AbortSignal) => Promise<string>
    verifyProblem?: string
    verifyImage?: CapturedImage
  } | null>(null)
  // Cloud copies of problem photos, keyed by turn id (upload runs in
  // parallel with the solve; persist() picks these up when they land).
  const uploadsRef = useRef<Record<string, { path: string; url: string }>>({})
  // Chip bulletproofing: debounce accidental double-taps, and count how many
  // times each step was explained so re-taps escalate instead of repeating.
  const lastChipRef = useRef<{ id: string; at: number }>({ id: '', at: 0 })
  const explainCountsRef = useRef<Record<string, number>>({})
  // Offline pill, two signals: NetInfo (instant OS truth — airplane mode
  // shows before any request is wasted) + request failures (catches "internet
  // fine, our server unreachable"). Either raises the pill.
  const online = useOnline()
  const [netDown, setNetDown] = useState(false)
  useEffect(() => {
    if (online) setNetDown(false) // connectivity returned — the stale error signal drops
  }, [online])
  // Caret position, so template keys can drop the cursor inside the structure
  // they insert (tap "fraction" → caret lands in the numerator).
  const selRef = useRef({ start: 0, end: 0 })
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined)
  // Context header for a problem opened from history (topic + date).
  const [problemMeta, setProblemMeta] = useState<{ topic: string | null; createdAt: number } | null>(null)
  // Identity of the conversation on screen. Changing it drives the
  // conversation→conversation PUSH (whole thread slides out/in as one
  // surface; the inert cards just ride it). 'live-*' keys are fresh problems.
  const [threadKey, setThreadKey] = useState('live-0')
  const hasThread = thread.length > 0
  const showThread = surface === 'thread' && hasThread
  const [inputFocused, setInputFocused] = useState(false)
  const [entryMode, setEntryMode] = useState<'source' | 'type'>('source')
  const blockingOverlayOpen = !!limitHit || verifyInfo
  const [overlayHeld, setOverlayHeld] = useState(false)

  useEffect(() => {
    if (!initialDraft?.trim()) return
    setInput(initialDraft.trim())
    setEntryMode('type')
  }, [initialDraft])

  useEffect(() => {
    if (blockingOverlayOpen) {
      setOverlayHeld(true)
      return
    }
    if (!overlayHeld) return
    const timer = setTimeout(() => setOverlayHeld(false), 330)
    return () => clearTimeout(timer)
  }, [blockingOverlayOpen, overlayHeld])

  // Capture/crop live in the root layer above the entire shell. They must not
  // mutate the shell chrome underneath; doing so made the dock collapse and
  // rebuild around the external gallery picker.
  const chrome: SolverChrome = blockingOverlayOpen || overlayHeld
    ? 'overlay'
    : showThread
      ? 'thread'
      : inputFocused
        ? 'typing'
        : 'entry'

  useEffect(() => {
    onChromeChange?.(chrome)
  }, [chrome, onChromeChange])

  useEffect(() => () => onChromeChange?.('entry'), [onChromeChange])

  // System/visible Back returns to the solver landing page without clearing
  // the retained solution. A follow-up draft belongs to the focused thread,
  // so it does not leak into the new-problem entry surface.
  useEffect(() => {
    if (surface !== 'entry' || !hasThread) return
    Keyboard.dismiss()
    setInput('')
    setSelection(undefined)
    setInputFocused(false)
  }, [hasThread, surface])

  // Visible feedback for the sign-in flow (linking fires no navigation, so the
  // moment needs its own confirmation): toast on guest→signed-in, toast on error.
  const wasAnonRef = useRef(user?.isAnonymous ?? false)
  useEffect(() => {
    if (wasAnonRef.current && user && !user.isAnonymous) {
      toast.show(t('auth.signedInAs', { name: user.name ?? user.email }))
      track('sign_in_linked')
    }
    wasAnonRef.current = user?.isAnonymous ?? false
  }, [user, toast, t])
  const lastAuthErrRef = useRef<string | null>(null)
  useEffect(() => {
    if (authError && authError !== lastAuthErrRef.current) toast.show(authError, 'alert-triangle')
    lastAuthErrRef.current = authError
  }, [authError, toast])
  // Signed into an existing account and the guest's work was carried over —
  // say so, or it looks like the previous problems vanished.
  useEffect(() => {
    if (carried && carried > 0) {
      toast.show(t('auth.carried', { n: carried }), 'download-cloud')
      clearCarried()
    }
  }, [carried, clearCarried, toast, t])

  // Keep a ref mirror of the thread so async solves persist the right snapshot.
  const commit = useCallback((next: Turn[]) => {
    threadRef.current = next
    setThread(next)
  }, [])

  // Usage pill + the gentle "that was the last one" beat: when a solve lands
  // exactly on the ceiling, say so once — the wall stops being a surprise.
  const prevUsageRef = useRef<DailyUsage | null>(null)
  useEffect(
    () =>
      subscribeDailyUsage((u) => {
        const prev = prevUsageRef.current
        prevUsageRef.current = u
        setUsage(u)
        if (u && u.used === u.limit && (!prev || prev.used < u.limit) && isFromToday(u.at)) {
          toast.show(t('usage.last'), 'info')
        }
      }),
    [toast, t],
  )

  // If the account changes mid-session (sign-out → fresh guest, or a guest
  // link that fell back to an existing Google account), the open problem
  // belongs to the OLD account. Sign-out no longer unmounts this screen —
  // clear the previous account's work IN PLACE: the thread pushes back to
  // the hero like any reset, no splash, no remount. (Guest → Google LINKING
  // keeps the same uid, so linked work correctly survives this.)
  useEffect(() => {
    if (prevUidRef.current !== user?.id) {
      prevUidRef.current = user?.id
      problemIdRef.current = null
      // The pill's count belongs to the OLD account (guest counts survive on
      // the install key, but the next metered solve repopulates it anyway).
      clearDailyUsage()
      // A solve (or verification) in flight belongs to the OLD account —
      // kill it, or its answer would commit into the fresh session.
      abortRef.current?.abort()
      abortRef.current = null
      verifyAbortRef.current?.abort()
      lastReqRef.current = null
      setSending(false)
      if (threadRef.current.length > 0) {
        setInput('')
        setProblemMeta(null)
        setThreadKey(`live-${Date.now()}`)
        commit([])
        onShowEntry()
      }
    }
  }, [user?.id, commit, onShowEntry])

  // Save the finished problem to Firestore (create on first solve, then update).
  // Fire-and-forget — a failed write must never disrupt solving.
  const persist = useCallback(
    async (turns: Turn[]) => {
      if (!user) return
      // Failed/pending turns are UI state, not part of the problem — drop
      // them. Cloud photo references ride along once their upload landed.
      const stored = toStoredTurns(
        turns
          .filter((x) => !x.pending && !x.error)
          .map((x) => {
            const up = uploadsRef.current[x.id]
            return up ? { ...x, imagePath: up.path, imageUrl: up.url } : x
          }),
        t('turn.photoProblem'),
      )
      if (stored.length === 0) return
      const firstUser = turns.find((x) => x.role === 'user')
      const isPhoto = !!firstUser?.imageUri || !!firstUser?.imagePath
      // Multi-line input must not produce multi-line history titles.
      let title = (firstUser?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 90)
      if (!title) {
        // Photo problems: the AI's restatement is the real, searchable title —
        // not the generic "Photo problem" label.
        const firstAsst = turns.find((x) => x.role === 'assistant' && !x.pending && !x.error)
        const restated = String(getSolveJson(firstAsst?.text ?? '')?.problem ?? '')
        title = latexToPlain(restated).replace(/\s+/g, ' ').trim().slice(0, 90) || t('turn.photoProblem')
      }
      const topic = extractTopic(turns)
      try {
        // The id is claimed SYNCHRONOUSLY before any await, so concurrent
        // saves (photo upload landing vs solve finishing) write the same doc —
        // the duplicate-create race cannot exist. Only the claimer stamps
        // createdAt; every save after that is a pure merge.
        let createdAt: 'now' | undefined
        if (!problemIdRef.current) {
          problemIdRef.current = newProblemId(user.id)
          createdAt = 'now'
        }
        await writeProblem(user.id, problemIdRef.current, { title, topic, turns: stored, photo: isPhoto }, createdAt)
      } catch (e) {
        // persistence is best-effort for the UX, but never invisible
        reportNonFatal(e, 'persist')
      }
    },
    [user, t],
  )

  // The correctness engine: machine-check the shown answer in the background;
  // on a failed check, silently re-solve with the deep model and swap in the
  // corrected solution. The "✓" badge only ever comes from a real code check.
  const verifyFlow = useCallback(
    // `capId` = the problem's daily-cap id (the user turn's id): the correction
    // re-solve below re-uses it so fixing a wrong answer never charges a
    // second daily slot.
    async (id: string, problemText: string, image?: CapturedImage, capId?: string) => {
      const turn = threadRef.current.find((x) => x.id === id)
      if (!turn) return
      const restated = String(getSolveJson(turn.text)?.problem ?? '').trim() || problemText.trim()
      // Skip ONLY genuinely un-gradable proofs (irrationality, "for all n",
      // no concrete number). A "prove that AD = 20" problem is verifiable — its
      // target is a free ground-truth checksum — so it now goes through.
      if (isAbstractProof(restated)) return
      // Abortable: reset / loading another problem / account switch kills a
      // stale verification instead of letting it burn quota in the dark.
      const ctrl = new AbortController()
      verifyAbortRef.current?.abort()
      verifyAbortRef.current = ctrl
      setVerifyingMap((m) => ({ ...m, [id]: 'check' }))
      const applyText = (text: string) => {
        commit(threadRef.current.map((x) => (x.id === id ? { ...x, text } : x)))
      }
      try {
        const v = await verifyAnswer(problemText, turn.text, ctrl.signal)
        if (ctrl.signal.aborted) return
        track('verify_result', { verdict: v })
        if (v === 'correct') {
          applyText(withJsonFlags(turn.text, { _verified: true }))
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        } else if (v === 'incorrect') {
          // RE-SOLVE FROM THE ORIGINAL INPUT, never the model's restatement:
          // if the first pass misread the source, re-solving its (wrong) text
          // just reconfirms the wrong problem. Photos re-read the image; typed
          // problems re-read the user's raw text. The CORRECTION_HINT tells the
          // deep model it failed a check, so it re-reads the givens instead of
          // repeating the misread — worth one shot even if it was already deep.
          const source = problemText.trim()
          if (image || source) {
            // Be honest about the extra work — the pill says "re-solving".
            setVerifyingMap((m) => ({ ...m, [id]: 'recheck' }))
            const deepRaw = image
              ? await solveImage(image, ctrl.signal, capId)
              : await solveDeep(source, ctrl.signal, CORRECTION_HINT, capId)
            if (ctrl.signal.aborted) return
            const v2 = isStructuredSolution(deepRaw) ? await verifyAnswer(source || restated, deepRaw, ctrl.signal) : 'unverifiable'
            if (ctrl.signal.aborted) return
            // Only ever earn a VERIFIED (green) badge — never a scary
            // "unconfirmed" warning we can't back. If the strong re-solve
            // verifies, swap it in green. Otherwise leave the answer as-is with
            // NO badge (calm, honest silence) — never a false alarm.
            if (v2 === 'correct') applyText(withJsonFlags(deepRaw, { _verified: true }))
          }
          // else: nothing better to try (photoless empty source) → stays neutral.
        }
        // 'incorrect' without a verified fix, and 'unverifiable' → no badge, no
        // warning; the answer stands calm (the badge is EARNED, never faked).
        persist(threadRef.current)
      } catch (e) {
        // verification is best-effort — never disturb the shown solution
        if (!ctrl.signal.aborted) reportNonFatal(e, 'verify')
      } finally {
        if (verifyAbortRef.current === ctrl) verifyAbortRef.current = null
        setVerifyingMap((m) => {
          const n = { ...m }
          delete n[id]
          return n
        })
      }
    },
    [commit, persist],
  )

  const run = useCallback(
    async (
      userTurn: Turn,
      solver: (signal: AbortSignal) => Promise<string>,
      verifyProblem?: string,
      verifyImage?: CapturedImage,
    ) => {
      const asstId = uid()
      const base = threadRef.current
      const ctrl = new AbortController()
      onOpenThread()
      abortRef.current = ctrl
      lastReqRef.current = { userTurn, solver, verifyProblem, verifyImage } // retry fuel
      coldDocRef.current = false // live turns reveal in the document
      commit([...base, userTurn, { id: asstId, role: 'assistant', text: '', pending: true }])
      setSending(true)
      try {
        const text = await solver(ctrl.signal)
        if (ctrl.signal.aborted) return
        setNetDown(false) // an answer arrived — the network is clearly back
        // The {"error":...} shape (unreadable photo / not math) is a FAILED
        // attempt, not a solution: show it as an error turn so Retry appears,
        // and never persist or verify it.
        const errMsg = errorResultMessage(text)
        if (errMsg) {
          commit([...base, userTurn, { id: asstId, role: 'assistant', text: errMsg, error: true }])
          return
        }
        const done: Turn[] = [...base, userTurn, { id: asstId, role: 'assistant', text }]
        commit(done)
        persist(done)
        track(verifyProblem !== undefined ? 'solve_done' : 'chat_reply')
        // First solves get the background correctness check (not follow-ups).
        // The image rides along so a photo's deep re-solve re-reads the photo.
        if (verifyProblem !== undefined && isStructuredSolution(text)) void verifyFlow(asstId, verifyProblem, verifyImage, userTurn.id)
      } catch (e) {
        if (ctrl.signal.aborted) {
          // User cancelled — quietly drop the attempt, back to where they were.
          commit(base)
          if (base.length === 0) onShowEntry()
          return
        }
        if (e instanceof DailyLimitError) {
          // The cap is a decision, not a failure: nothing half-done stays in
          // the thread. The question returns to the composer (typed text is
          // never lost) and the upsell sheet takes it from here.
          commit(base)
          if (base.length === 0) onShowEntry()
          if (userTurn.text) setInput((v) => v || userTurn.text)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
          track('limit_hit', { kind: e.info.kind, guest: e.info.guest })
          setLimitHit({ kind: e.info.kind, limit: e.info.limit, guest: e.info.guest })
          return
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
        const msg = friendlyError(e, t)
        track('solve_error', { network: msg === t('err.network') })
        if (msg === t('err.network')) setNetDown(true)
        commit([...base, userTurn, { id: asstId, role: 'assistant', text: msg, error: true }])
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        setSending(false)
      }
    },
    [commit, onOpenThread, onShowEntry, persist, t, verifyFlow],
  )

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
    // abort may not reject an in-flight fetch immediately on RN — clear the UI now
    const base = threadRef.current.filter((x) => !x.pending)
    const lastUser = base.length && base[base.length - 1].role === 'user' ? base[base.length - 1] : null
    commit(lastUser ? base.slice(0, -1) : base)
    // Nothing is lost on Stop: the question returns to the composer.
    if (lastUser?.text) setInput((v) => v || lastUser.text)
    setSending(false)
    if (base.length === 0) onShowEntry()
  }, [commit, onShowEntry])

  // Retry the failed request exactly as sent — never make the user retype.
  const retryLast = useCallback(() => {
    const req = lastReqRef.current
    const last = threadRef.current[threadRef.current.length - 1]
    if (!req || !last?.error || sending) return
    commit(threadRef.current.filter((x) => !x.error && x.id !== req.userTurn.id))
    run(req.userTurn, req.solver, req.verifyProblem, req.verifyImage)
  }, [commit, run, sending])

  const priorTurns = useCallback((): ChatTurn[] => {
    const all = threadRef.current
      .filter((t) => !t.pending && !t.error)
      .map((t): ChatTurn => ({ role: t.role, text: t.text || 'Here is my problem (in the image I sent).' }))
    // Long threads (many step explanations) must not bloat every follow-up:
    // keep the anchor (problem + its solution) and only the recent exchange.
    if (all.length <= 8) return all
    return [...all.slice(0, 2), ...all.slice(-6)]
  }, [])

  const reset = useCallback(() => {
    Keyboard.dismiss() // fresh problem, fresh screen — no keyboard left over the hero
    verifyAbortRef.current?.abort() // a verification of the old thread is moot now
    problemIdRef.current = null
    setProblemMeta(null)
    explainCountsRef.current = {}
    setThreadKey(`live-${Date.now()}`)
    commit([])
    setEntryMode('source')
    onShowEntry()
  }, [commit, onShowEntry])

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || sending) return
      // Definitely offline: say so NOW and keep the input — don't burn a
      // failed attempt the user has to watch time out.
      if (!online) {
        toast.show(t('err.network'), 'wifi-off')
        return
      }
      // Sending = done typing: drop the keyboard so the solution gets the
      // whole screen (the pending card and the answer land in full view).
      Keyboard.dismiss()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      setInput('')
      const isFirst = surface === 'entry'
      if (isFirst && threadRef.current.length > 0) reset()
      track(isFirst ? 'solve_start' : 'chat_send', isFirst ? { source: 'text' } : undefined)
      const turns: ChatTurn[] = [...priorTurns(), { role: 'user', text }]
      // The user turn's id doubles as the problem's daily-cap id — every
      // request of this problem (escalation, correction re-solve, retry)
      // shares it, so the whole flow charges ONE free-tier slot.
      const turnId = uid()
      run(
        { id: turnId, role: 'user', text },
        (sig) =>
          isFirst
            ? solveProblem(text, sig, turnId)
            : followUp(turns, sig, problemIdRef.current ?? undefined),
        isFirst ? text : undefined, // machine-check first solves only
      )
    },
    [sending, online, toast, t, run, priorTurns, reset, surface],
  )

  const loadProblem = useCallback(
    (p: Problem) => {
      Keyboard.dismiss()
      // Tapping the conversation that is already open: the sheet just closes.
      if (problemIdRef.current === p.id && threadRef.current.length > 0) {
        onOpenThread()
        return
      }
      // A solve in flight belongs to the conversation being LEFT — cancel it,
      // or its answer would overwrite the freshly loaded thread. Same for a
      // background verification of the old thread.
      if (sending) cancelRun()
      verifyAbortRef.current?.abort()
      Haptics.selectionAsync().catch(() => {})
      // Choreography: the sheet starts sliding away, and mid-exit the thread
      // PUSH begins — old conversation slides out, the new one slides in as
      // one surface carrying its inert cards. WebViews light up on landing.
      setTimeout(async () => {
        problemIdRef.current = p.id
        const turns = await Promise.all(
          p.turns.map(async (t) => ({
            id: uid(),
            role: t.role,
            text: t.text,
            // LOCAL file when it exists (instant, offline); cloud otherwise.
            imageUri: await resolveImageUri(t.imagePath, t.imageUrl),
            imagePath: t.imagePath,
            imageUrl: t.imageUrl,
            imageW: t.imageW,
            imageH: t.imageH,
          })),
        )
        // Reading mode: the document renders whole, no entrances, and opens
        // at the TOP — a problem reads from its title down.
        coldDocRef.current = true
        explainCountsRef.current = {} // fresh problem, fresh teaching history
        setProblemMeta({ topic: p.topic, createdAt: p.createdAt })
        setThreadKey(p.id)
        commit(turns)
        onOpenThread()
      }, 200)
    },
    [commit, sending, cancelRun, onOpenThread],
  )

  const openedInitialProblemRef = useRef<string | null>(null)
  useEffect(() => {
    if (!initialProblem || openedInitialProblemRef.current === initialProblem.id) return
    openedInitialProblemRef.current = initialProblem.id
    loadProblem(initialProblem)
  }, [initialProblem, loadProblem])

  const handleChip = useCallback(
    (id: string) => {
      // No dead taps: busy means FEEDBACK, never silence.
      if (sending) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
        toast.show(t('busy.wait'), 'clock')
        return
      }
      // Accidental double-taps fire twice from the WebView — debounce them.
      const now = Date.now()
      if (lastChipRef.current.id === id && now - lastChipRef.current.at < 900) return
      lastChipRef.current = { id, at: now }
      // Chip taps start a new turn — same rule as sending: keyboard down.
      Keyboard.dismiss()
      if (id === 'mistake') {
        // The saved problem is wrong input — remove it (and its cloud photo)
        // so history stays clean.
        if (user && problemIdRef.current) removeProblem(user.id, problemIdRef.current).catch(() => {})
        deleteProblemImages(threadRef.current.map((x) => x.imagePath ?? uploadsRef.current[x.id]?.path))
        reset()
        return
      }
      if (id.startsWith('step:')) {
        const n = id.slice(5)
        // A good teacher escalates, then CHANGES METHOD: 1st re-explain asks
        // for "simpler", the 2nd for a completely different angle, and from
        // the 3rd on we stop re-explaining and pivot to guided practice on
        // an easier version of the same move — the user never hits a wall,
        // they hit a better strategy.
        const asked = (explainCountsRef.current[n] = (explainCountsRef.current[n] ?? 0) + 1)
        const ask =
          asked <= 1
            ? `Explică din nou pasul ${n}, mai simplu. Nu înțeleg transformarea făcută.`
            : asked === 2
              ? `Ai explicat deja pasul ${n}, dar încă nu îl înțeleg. Explică-l într-un mod complet diferit, cu cele mai simple cuvinte și cu un exemplu foarte scurt folosind numere concrete.`
              : `Am primit deja două explicații pentru pasul ${n} și încă nu îl înțeleg. Schimbă metoda: dă-mi o singură mini-problemă asemănătoare, dar mult mai ușoară, care izolează aceeași idee. Rezolv-o împreună cu mine în replici scurte și încurajatoare, apoi leagă ideea de pasul ${n} din problema inițială.`
        const label = asked >= 3 ? t('turn.practiceStep', { n }) : t('turn.explainStep', { n })
        run({ id: uid(), role: 'user', text: label }, (sig) =>
          followUp([...priorTurns(), { role: 'user', text: ask }], sig, problemIdRef.current ?? undefined),
        )
        return
      }
      run({ id: uid(), role: 'user', text: t('turn.similar') }, (sig) =>
        followUp(
          [...priorTurns(), { role: 'user', text: 'Dă-mi o problemă asemănătoare pentru exersare, doar enunțul, fără soluție.' }],
          sig,
          problemIdRef.current ?? undefined,
        ),
      )
    },
    [sending, run, reset, priorTurns, user, t, toast],
  )

  // Open the in-app capture flow (Rezolvo's own camera + trim — never the
  // system camera). The photo comes back through solvePhoto below.
  const snap = useCallback(
    (source: 'camera' | 'library') => {
      if (!sending) setCapture(source)
    },
    [sending],
  )

  const solvePhoto = useCallback(
    (img: CapturedImage) => {
      setCapture(null)
      if (!img.base64) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      // A photo is always a NEW problem — one thread per problem keeps the
      // model accurate and history clean, so leave the previous thread behind.
      if (threadRef.current.length > 0) reset()
      const turnId = uid()
      track('solve_start', { source: 'photo' })
      // Permanent LOCAL copy first (the capture lives in purgeable cache):
      // history opens on this device never touch the network for the photo.
      saveLocalCopy(turnId, img.uri).catch(() => {})
      // Cloud copy in PARALLEL with the solve — never blocks it. When it
      // lands, the saved problem gets its image references; if it fails,
      // the photo simply stays local-only for this session.
      if (user) {
        uploadProblemImage(user.id, turnId, img.uri)
          .then((si) => {
            uploadsRef.current[turnId] = si
            persist(threadRef.current)
          })
          .catch((e) => reportNonFatal(e, 'photo-upload'))
      }
      // '' → the verifier reads the problem from the solution's own restatement;
      // `img` rides along so a failed check re-solves by RE-READING THE PHOTO,
      // never the (possibly misread) restatement.
      run(
        { id: turnId, role: 'user', text: '', imageUri: img.uri, imageW: img.width, imageH: img.height },
        (sig) => solveImage(img, sig, turnId),
        '',
        img,
      )
    },
    [run, reset, user, persist],
  )

  const typeInstead = useCallback(() => {
    setCapture(null)
    setEntryMode('type')
    // focus once the visor has slid away, so the keyboard rises over Home
    setTimeout(() => inputRef.current?.focus(), 280)
  }, [])

  useEffect(() => {
    if (!entryAction) return
    if (entryAction.kind === 'type') typeInstead()
    else snap(entryAction.kind)
    onEntryActionHandled?.()
  }, [entryAction, onEntryActionHandled, snap, typeInstead])

  // A math key: splice its template in at the caret, then park the caret
  // inside the structure (fraction → numerator, root → under the radical).
  const insertKey = useCallback(
    (k: MathKey) => {
      setInput((prev) => {
        const { start, end } = selRef.current
        const s = Math.min(Math.max(0, start), prev.length)
        const e = Math.min(Math.max(s, end), prev.length)
        const next = prev.slice(0, s) + k.insert + prev.slice(e)
        const caret = s + k.insert.length - k.back
        selRef.current = { start: caret, end: caret }
        setSelection({ start: caret, end: caret })
        return next
      })
      inputRef.current?.focus()
    },
    [],
  )

  // Live preview: only for math-looking input (word problems stay prose).
  const previewLatex = useMemo(() => (isMathInput(input) ? plainToLatex(input) : ''), [input])

  // "Fix it" on the read-back problem: the read text was WRONG input, so the
  // saved doc goes, the thread resets, and the composer opens pre-filled with
  // the editable (plain-math) problem — fix one symbol and resend.
  const handleFixProblem = useCallback(
    (problemLatex: string) => {
      if (sending) cancelRun()
      if (user && problemIdRef.current) removeProblem(user.id, problemIdRef.current).catch(() => {})
      deleteProblemImages(threadRef.current.map((x) => x.imagePath ?? uploadsRef.current[x.id]?.path))
      reset()
      setInput(latexToPlain(problemLatex))
      setTimeout(() => inputRef.current?.focus(), 560) // after the push lands
    },
    [sending, cancelRun, user, reset],
  )

  // Copy/Share/Report fired from inside the document (per solution turn).
  const handleDocAction = useCallback(
    (kind: 'copy' | 'share' | 'report', turnId: string) => {
      const turn = threadRef.current.find((x) => x.id === turnId)
      if (!turn) return
      if (kind === 'report') {
        // Play's AI-content policy requires in-app flagging of AI output.
        // The report reaches us as a Crashlytics non-fatal + analytics event
        // carrying the problem id, so the flagged content can be pulled up.
        track('content_report', { problem: problemIdRef.current ?? 'none' })
        reportNonFatal(new Error('content_report'), `user flagged AI content, problem=${problemIdRef.current ?? '?'} turn=${turnId}`)
        Haptics.selectionAsync().catch(() => {})
        toast.show(t('action.reported'), 'check')
        return
      }
      const text = solutionShareText(turn.text, {
        problem: t('share.problem'),
        answer: t('solution.answer'),
        signature: t('share.signature'),
      })
      track('share', { kind })
      if (kind === 'copy') {
        Clipboard.setStringAsync(text)
        Haptics.selectionAsync().catch(() => {})
        toast.show(t('action.copied'), 'check')
      } else {
        Share.share({ message: text })
      }
    },
    [t, toast],
  )

  const docLabels: DocLabels = useMemo(
    () => ({
      problem: t('share.problem'),
      photoProblem: t('turn.photoProblem'),
      readAs: t('doc.readAs'),
      fix: t('doc.fix'),
      copy: t('action.copy'),
      share: t('action.share'),
      report: t('action.report'),
      solution: t('solution.label'),
      answer: t('solution.answer'),
      graph: t('solution.graph'),
      figure: t('solution.figure'),
      numberline: t('solution.numberline'),
      similar: t('solution.chip.similar'),
      mistake: t('solution.chip.mistake'),
      verifying: t('solution.verifying'),
      reverifying: t('solution.reverifying'),
      verified: t('solution.verified'),
      retry: t('err.retry'),
      cancel: t('pending.cancel'),
      you: t('doc.you'),
      pending: [t('pending.1'), t('pending.2'), t('pending.3'), t('pending.4')],
    }),
    [t],
  )

  const activeTopic = problemMeta?.topic ?? extractTopic(thread)
  const contextTitle = activeTopic || (sending ? 'Rezolvare în curs' : 'Soluția problemei')
  const openUsage = () => {
    if (!usage || !isFromToday(usage.at)) return
    if (usage.used >= usage.limit) {
      setLimitHit({ kind: 'solve', limit: usage.limit, guest: user?.isAnonymous ?? true })
    } else {
      toast.show(t('usage.info', { used: usage.used, limit: usage.limit }), 'info')
    }
  }

  return (
    <ScreenBackground>
      {showThread ? (
        <ContextHeader
          eyebrow="REZOLVĂ"
          title={contextTitle}
          onBack={onExit}
          backLabel="Înapoi în aplicație"
          action={{
            icon: 'plus',
            label: 'Problemă nouă',
            onPress: reset,
            disabled: sending,
          }}
        />
      ) : (
        <ContextHeader
          eyebrow="REZOLVĂ"
          title={entryMode === 'type' ? 'Scrie problema' : 'Alege sursa'}
          onBack={entryMode === 'type' ? () => {
            Keyboard.dismiss()
            setEntryMode('source')
          } : onExit}
          backLabel={entryMode === 'type' ? 'Înapoi la surse' : 'Înapoi în aplicație'}
        />
      )}

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={-insets.bottom}>
        <View style={styles.column}>
        {/* Hero ↔ thread AND conversation ↔ conversation push sideways like a
            navigation — one opaque surface slides out, the next slides in. */}
        <CrossFade dep={showThread ? `thread:${threadKey}` : 'hero'} axis="x" style={styles.flex}>
        {!showThread ? (
          <ScreenContent style={styles.entryWrap}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.entryScroll}
            >
              <View style={styles.entryIntro}>
                <Txt style={[styles.entryTitle, { color: c.text, fontFamily: theme.font.display }]}>
                  {entryMode === 'source' ? 'Rezolvă orice problemă' : 'Scrie enunțul complet'}
                </Txt>
                <Txt size={13.5} color={c.textMuted} style={styles.entryDescription}>
                  {entryMode === 'source'
                    ? 'Fotografiază, alege o imagine sau scrie enunțul.'
                    : 'Include toate datele și cerința. Bara matematică te ajută cu expresiile.'}
                </Txt>
              </View>

              {(netDown || !online) && (
                <View style={[styles.netBar, { backgroundColor: c.dangerSoft }]}>
                  <RezIcon name="offline" size={14} color={c.danger} accent={c.danger} />
                  <Txt size={12} weight="semibold" color={c.danger}>
                    {t('net.offline')}
                  </Txt>
                </View>
              )}

              {entryMode === 'source' ? (
                <SolverSourcePicker
                  hasOpenSolution={hasThread}
                  solving={sending}
                  activeTopic={activeTopic ?? undefined}
                  onContinue={onOpenThread}
                  onCamera={() => snap('camera')}
                  onLibrary={() => snap('library')}
                  onType={typeInstead}
                />
              ) : (
              <>
                <TypedProblemEditor
                  inputRef={inputRef}
                  value={input}
                  focused={inputFocused}
                  selection={selection}
                  previewLatex={previewLatex}
                  onChange={(value) => {
                    setInput(value)
                    setSelection(undefined)
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onSelectionChange={(event) => {
                    selRef.current = event.nativeEvent.selection
                  }}
                  onInsertSymbol={insertKey}
                  onSubmit={() => sendText(input)}
                />

              {!inputFocused && <View style={styles.entryFooter}>
                <View style={styles.notebookNote}>
                  <RezIcon name="document" size={16} color={c.textMuted} accent={c.accent} />
                  <Txt size={10.5} color={c.textMuted}>
                    Rezolvările sunt salvate în Caietul meu.
                  </Txt>
                </View>
                {usage && isFromToday(usage.at) && (
                  <Press
                    onPress={openUsage}
                    accessibilityRole="button"
                    accessibilityLabel={t('usage.pill', { used: usage.used, limit: usage.limit })}
                    style={[
                      styles.usagePill,
                      {
                        backgroundColor: usage.used >= usage.limit ? c.accentSoft : c.surface,
                        borderColor: usage.used >= usage.limit ? c.accent : c.border,
                      },
                    ]}
                  >
                    <RezIcon name="quota" size={15} color={c.accent} accent={c.accent} />
                    <Txt
                      weight="bold"
                      size={10.5}
                      color={usage.used >= usage.limit ? c.accent : c.textMuted}
                    >
                      {t('usage.pill', { used: usage.used, limit: usage.limit })}
                    </Txt>
                  </Press>
                )}
              </View>}

              {user?.isAnonymous ? (
                <Pressable onPress={signIn} hitSlop={6}>
                  <Txt size={10.5} weight="semibold" color={c.accent} style={styles.disc}>
                    Conectează-te pentru a păstra problemele rezolvate
                  </Txt>
                </Pressable>
              ) : (
                <Txt size={10} color={c.textFaint} style={[styles.disc, { fontFamily: theme.font.mono }]}>
                  Profu’ de Mate poate greși. Verifică rezultatele importante.
                </Txt>
              )}
              </>
              )}
            </ScrollView>
          </ScreenContent>
        ) : (
          // The conversation as ONE living document (no bubbles): problem as
          // the page title, solution as the body, follow-ups as annotations.
          // Layout belongs entirely to the browser — the height-sync bug class
          // cannot exist here.
          <ThreadDocument
            turns={thread}
            verifying={verifyingMap}
            cold={coldDocRef.current}
            meta={
              problemMeta
                ? [problemMeta.topic?.toUpperCase(), new Date(problemMeta.createdAt).toLocaleDateString()]
                    .filter(Boolean)
                    .join('  ·  ')
                : null
            }
            labels={docLabels}
            onChip={handleChip}
            onVerifyTap={() => setVerifyInfo(true)}
            onRetry={retryLast}
            onCancel={cancelRun}
            onAction={handleDocAction}
            onFixProblem={handleFixProblem}
          />
        )}
        </CrossFade>

        {showThread && <View style={[styles.composerWrap, { paddingBottom: insets.bottom + 8 }]}>
          {(netDown || !online) && (
            <ReAnimated.View entering={bubbleEnter} style={[styles.netBar, { backgroundColor: c.dangerSoft }]}>
              <RezIcon name="offline" size={14} color={c.danger} accent={c.danger} />
              <Txt size={12} weight="semibold" color={c.danger}>
                {t('net.offline')}
              </Txt>
            </ReAnimated.View>
          )}
          {/* What you'll send, typeset — the same converter that renders it
              in the document, so the preview IS the result. */}
          {!!previewLatex && <MathPreview latex={previewLatex} label={t('composer.preview')} />}
          {(inputFocused || !!input.trim()) && <SymbolBar onInsert={insertKey} />}
          <View style={[styles.field, { backgroundColor: c.surface, borderColor: inputFocused ? c.accent : c.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: c.text }]}
              placeholder={showThread ? 'Întreabă despre soluție…' : 'Scrie problema…'}
              placeholderTextColor={c.textFaint}
              value={input}
              onChangeText={(v) => {
                setInput(v)
                setSelection(undefined) // hand the caret back to the OS while typing
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              selection={selection}
              onSelectionChange={(e) => {
                selRef.current = e.nativeEvent.selection
              }}
              multiline
              maxFontSizeMultiplier={1.2}
            />
            {/* Send morphs into STOP while solving — one control, two verbs
                (the standard AI-app pattern; never a dead grey button). */}
            <Press
              onPress={() => (sending ? cancelRun() : sendText(input))}
              disabled={!sending && !input.trim()}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={sending ? t('a11y.stop') : t('a11y.send')}
              style={styles.sendBtn}
            >
              {sending ? (
                <View style={[styles.sendFill, { backgroundColor: c.text }]}>
                  <View style={styles.stopSquare} />
                </View>
              ) : input.trim() ? (
                <LinearGradient
                  colors={theme.gradient.brand as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendFill}
                >
                  <RezIcon name="send" size={18} color={c.onAccent} accent={c.onAccent} />
                </LinearGradient>
              ) : (
                <View style={[styles.sendFill, { backgroundColor: c.surfaceAlt }]}>
                  <RezIcon name="send" size={18} color={c.textFaint} accent={c.textFaint} />
                </View>
              )}
            </Press>
          </View>
          {user?.isAnonymous ? (
            <Pressable onPress={signIn} hitSlop={6}>
              <Txt size={10.5} weight="semibold" color={c.accent} style={styles.disc}>
                Conectează-te pentru a păstra problemele rezolvate
              </Txt>
            </Pressable>
          ) : (
            <Txt size={10} color={c.textFaint} style={[styles.disc, { fontFamily: theme.font.mono }]}>
              Profu’ de Mate poate greși. Verifică rezultatele importante.
            </Txt>
          )}
        </View>}
        </View>
      </KeyboardAvoidingView>

      {/* The freemium moment: today's solves are done — sign in (guests) or
          go Premium. NO blurred steps anywhere; the cap is the only wall. */}
      <LimitSheet
        open={!!limitHit}
        kind={limitHit?.kind ?? 'solve'}
        limit={limitHit?.limit ?? 5}
        guest={limitHit?.guest ?? true}
        onClose={() => setLimitHit(null)}
        onPremium={() => setLimitHit(null)}
      />
      {/* The trust pitch, told at the moment of trust: what "Verified" means. */}
      <InfoDialog
        open={verifyInfo}
        tone="success"
        title={t('verify.info.title.ok')}
        message={t('verify.info.body.ok')}
        okLabel={t('common.ok')}
        onClose={() => setVerifyInfo(false)}
      />
      <CaptureScreen open={capture} onClose={() => setCapture(null)} onUsePhoto={solvePhoto} onTypeInstead={typeInstead} />
    </ScreenBackground>
  )
}

const BUBBLE_EASE = REasing.bezier(0.22, 1, 0.36, 1)
function bubbleEnter(v: EntryAnimationsValues) {
  'worklet'
  return {
    initialValues: { originY: v.targetOriginY + 56 },
    animations: { originY: withTiming(v.targetOriginY, { duration: 480, easing: BUBBLE_EASE }) },
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: APP_CONTENT_MAX_WIDTH, alignSelf: 'center' },
  entryWrap: { paddingHorizontal: 0 },
  entryScroll: {
    paddingBottom: 22,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  entryIntro: { paddingBottom: 13 },
  entryTitle: { fontSize: 25, letterSpacing: -0.85, lineHeight: 30 },
  entryDescription: { lineHeight: 19, marginTop: 5, maxWidth: 520 },
  orRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginVertical: 15 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  photoMethods: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  photoPrimarySlot: { flex: 1 },
  photoPrimary: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 100,
    overflow: 'hidden',
    padding: 14,
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 0,
  },
  photoIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  photoCopy: { flex: 1, gap: 2, minWidth: 0 },
  galleryCard: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 100,
    paddingHorizontal: 10,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    width: 104,
  },
  galleryIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    marginBottom: 6,
    width: 42,
  },
  galleryCaption: { marginTop: 1, textAlign: 'center' },
  typeCard: {
    borderRadius: 22,
    borderWidth: 2,
    marginTop: 13,
    padding: 12,
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
  },
  typeHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 9,
  },
  typeIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  typeFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  typeHint: {
    flex: 1,
    lineHeight: 14,
  },
  entryFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  notebookNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    minHeight: 40,
  },
  usagePill: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    height: 40,
    paddingHorizontal: 10,
  },

  // composer
  composerWrap: { paddingHorizontal: 14, paddingTop: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#E5E5E5',
    borderBottomColor: '#D0D0D0',
    borderRadius: 22,
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: '#FFFFFF',
  },
  input: { flex: 1, fontSize: 15.5, fontFamily: 'Inter_400Regular', maxHeight: 120, paddingVertical: 8, paddingTop: 9 },
  disc: { textAlign: 'center', marginTop: 7 },

  netBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
  },
  sendBtn: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-end' as const,
    marginBottom: 2,
  },
  sendFill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
})
