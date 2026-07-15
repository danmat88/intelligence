import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import ReAnimated, { Easing as REasing, withTiming, type EntryAnimationsValues } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import CrossFade from '../components/ui/CrossFade'
import Press from '../components/ui/Press'
import ScreenBackground from '../components/ui/ScreenBackground'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'
import InfoDialog from '../components/ui/InfoDialog'
import ThreadDocument, { type DocLabels } from '../components/ui/ThreadDocument'
import SymbolBar, { type MathKey } from '../components/ui/SymbolBar'
import MathPreview from '../components/ui/MathPreview'
import { isMathInput, plainToLatex } from '../solve/mathInput'
import type { CapturedImage } from '../solve/capture'
import { solveImage, solveProblem, followUp, solveDeep, verifyAnswer } from '../solve/solve'
import { CORRECTION_HINT } from '../solve/prompt'
import { latexToPlain, solutionShareText } from '../solve/shareText'
import { getSolveJson, isAbstractProof, isStructuredSolution, withJsonFlags } from '../solve/verdict'
import type { ChatTurn } from '../ai/types'
import { DailyLimitError } from '../ai/limits'
import { useI18n, type StringKey } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { newProblemId, writeProblem, removeProblem, toStoredTurns, type Problem } from '../solve/store'
import { reportNonFatal } from '../lib/report'
import { uploadProblemImage, deleteProblemImages, saveLocalCopy, resolveImageUri } from '../solve/imageStore'
import SettingsModal from './SettingsModal'
import HistorySheet from './HistorySheet'
import CaptureScreen from './CaptureScreen'
import LimitSheet from './LimitSheet'
import PaywallSheet from './PaywallSheet'

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
export default function SolverScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const { user, signIn, signingIn, error: authError, carried, clearCarried } = useAuth()
  const { t, langName } = useI18n()
  const toast = useToast()
  const [thread, setThread] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // The daily-cap upsell (server said DAILY_LIMIT/CHAT_LIMIT) and the paywall.
  const [limitHit, setLimitHit] = useState<{ kind: 'solve' | 'chat'; limit: number; guest: boolean } | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
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
  // Event-driven offline pill: raised by a network-classified failure,
  // cleared by the next successful answer.
  const [netDown, setNetDown] = useState(false)
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
  const empty = thread.length === 0

  // Visible feedback for the sign-in flow (linking fires no navigation, so the
  // moment needs its own confirmation): toast on guest→signed-in, toast on error.
  const wasAnonRef = useRef(user?.isAnonymous ?? false)
  useEffect(() => {
    if (wasAnonRef.current && user && !user.isAnonymous) {
      toast.show(t('auth.signedInAs', { name: user.name ?? user.email }))
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
      }
    }
  }, [user?.id, commit])

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
              ? await solveImage(image, langName, ctrl.signal, capId)
              : await solveDeep(source, langName, ctrl.signal, CORRECTION_HINT, capId)
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
    [commit, persist, langName],
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
        // First solves get the background correctness check (not follow-ups).
        // The image rides along so a photo's deep re-solve re-reads the photo.
        if (verifyProblem !== undefined && isStructuredSolution(text)) void verifyFlow(asstId, verifyProblem, verifyImage, userTurn.id)
      } catch (e) {
        if (ctrl.signal.aborted) {
          // User cancelled — quietly drop the attempt, back to where they were.
          commit(base)
          return
        }
        if (e instanceof DailyLimitError) {
          // The cap is a decision, not a failure: nothing half-done stays in
          // the thread. The question returns to the composer (typed text is
          // never lost) and the upsell sheet takes it from here.
          commit(base)
          if (userTurn.text) setInput((v) => v || userTurn.text)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
          setLimitHit({ kind: e.info.kind, limit: e.info.limit, guest: e.info.guest })
          return
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
        const msg = friendlyError(e, t)
        if (msg === t('err.network')) setNetDown(true)
        commit([...base, userTurn, { id: asstId, role: 'assistant', text: msg, error: true }])
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        setSending(false)
      }
    },
    [commit, persist, t, verifyFlow],
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
  }, [commit])

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

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || sending) return
      // Sending = done typing: drop the keyboard so the solution gets the
      // whole screen (the pending card and the answer land in full view).
      Keyboard.dismiss()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      setInput('')
      const isFirst = threadRef.current.length === 0
      const turns: ChatTurn[] = [...priorTurns(), { role: 'user', text }]
      // The user turn's id doubles as the problem's daily-cap id — every
      // request of this problem (escalation, correction re-solve, retry)
      // shares it, so the whole flow charges ONE free-tier slot.
      const turnId = uid()
      run(
        { id: turnId, role: 'user', text },
        (sig) =>
          isFirst
            ? solveProblem(text, langName, sig, turnId)
            : followUp(turns, langName, sig, problemIdRef.current ?? undefined),
        isFirst ? text : undefined, // machine-check first solves only
      )
    },
    [sending, run, priorTurns, langName],
  )

  const reset = useCallback(() => {
    Keyboard.dismiss() // fresh problem, fresh screen — no keyboard left over the hero
    verifyAbortRef.current?.abort() // a verification of the old thread is moot now
    problemIdRef.current = null
    setProblemMeta(null)
    explainCountsRef.current = {}
    setThreadKey(`live-${Date.now()}`)
    commit([])
  }, [commit])

  const loadProblem = useCallback(
    (p: Problem) => {
      Keyboard.dismiss()
      // Tapping the conversation that is already open: the sheet just closes.
      if (problemIdRef.current === p.id && threadRef.current.length > 0) return
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
      }, 200)
    },
    [commit, sending, cancelRun],
  )

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
            ? `Explain step ${n} again, more simply — I don't get that move.`
            : asked === 2
              ? `You already explained step ${n} and I STILL don't get it. Explain it in a COMPLETELY different way than before — simplest possible words, and include a tiny concrete example with real numbers.`
              : `The student has now heard two explanations of step ${n} and still doesn't get it. STOP re-explaining. Switch method like a good teacher: give ONE similar but noticeably EASIER mini-problem that isolates the same move, walk through it together in short encouraging lines, and END by connecting it back to step ${n} of the original problem.`
        const label = asked >= 3 ? t('turn.practiceStep', { n }) : t('turn.explainStep', { n })
        run({ id: uid(), role: 'user', text: label }, (sig) =>
          followUp([...priorTurns(), { role: 'user', text: ask }], langName, sig, problemIdRef.current ?? undefined),
        )
        return
      }
      run({ id: uid(), role: 'user', text: t('turn.similar') }, (sig) =>
        followUp(
          [...priorTurns(), { role: 'user', text: 'Give me a similar problem to practice — just the problem, no solution.' }],
          langName,
          sig,
          problemIdRef.current ?? undefined,
        ),
      )
    },
    [sending, run, reset, priorTurns, user, t, langName, toast],
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
        (sig) => solveImage(img, langName, sig, turnId),
        '',
        img,
      )
    },
    [run, reset, langName, user, persist],
  )

  const typeInstead = useCallback(() => {
    setCapture(null)
    // focus once the visor has slid away, so the keyboard rises over Home
    setTimeout(() => inputRef.current?.focus(), 280)
  }, [])

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

  // Copy/Share fired from inside the document (per solution turn).
  const handleDocAction = useCallback(
    (kind: 'copy' | 'share', turnId: string) => {
      const turn = threadRef.current.find((x) => x.id === turnId)
      if (!turn) return
      const text = solutionShareText(turn.text, {
        problem: t('share.problem'),
        answer: t('solution.answer'),
        signature: t('share.signature'),
      })
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

  return (
    <ScreenBackground>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerInner}>
        <Txt style={[styles.wordmark, { fontFamily: theme.font.display, color: c.text }]}>
          Rezolv
          <Txt style={{ fontFamily: theme.font.display, color: c.accent, fontSize: 21 }}>o</Txt>
        </Txt>
        <View style={styles.headerRight}>
          {!empty && (
            <Press onPress={() => !sending && reset()} hitSlop={8} style={[styles.newBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
              <Feather name="plus" size={15} color={c.accent} />
              <Txt weight="semibold" size={13} color={c.accent}>
                {t('header.new')}
              </Txt>
            </Press>
          )}
          {/* Guests save work too (anonymous uid), so history is always available. */}
          <Press
            onPress={() => setHistoryOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('history.title')}
            style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Feather name="clock" size={19} color={c.textMuted} />
          </Press>
          {/* Account slot: FIXED 38px footprint in both states, so the swap
              never resizes the row and neighbours never move. */}
          <CrossFade dep={user?.isAnonymous ? 'guest' : 'account'} style={styles.accountSlot}>
            {user?.isAnonymous ? (
              // Guest: the slot opens Settings (sign-in card + language + legal
              // live there), accent-ringed so it still invites a tap. One-tap
              // sign-in stays available from the composer CTA below.
              <Press
                onPress={() => setSettingsOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.title')}
                style={[styles.iconBtn, { backgroundColor: c.accentSoft, borderColor: c.accent }]}
              >
                {signingIn ? (
                  <ActivityIndicator size="small" color={c.accent} />
                ) : (
                  <Feather name="user" size={17} color={c.accent} />
                )}
              </Press>
            ) : (
              // Signed in: your avatar IS the account button — the visible proof
              // you're logged in. Falls back to the gear when there's no photo.
              <Press
                onPress={() => setSettingsOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.title')}
                style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              >
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatar} />
                ) : (
                  <Feather name="settings" size={19} color={c.textMuted} />
                )}
              </Press>
            )}
          </CrossFade>
        </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={-insets.bottom}>
        <View style={styles.column}>
        {/* Hero ↔ thread AND conversation ↔ conversation push sideways like a
            navigation — one opaque surface slides out, the next slides in. */}
        <CrossFade dep={empty ? 'hero' : `thread:${threadKey}`} axis="x" style={styles.flex}>
        {empty ? (
          <ScrollView
            contentContainerStyle={styles.heroWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* ambient math watermark — the approved mockup's giant faint ∫ */}
            <Txt
              pointerEvents="none"
              maxFontSizeMultiplier={1}
              style={[styles.wm, { fontFamily: theme.font.serifItalic, color: c.accent }]}
            >
              ∫
            </Txt>
            <Txt size={11} color={c.textFaint} style={[styles.kicker, { fontFamily: theme.font.mono }]}>
              {user && !user.isAnonymous && user.name
                ? t('hero.kicker.named', { name: user.name.split(' ')[0].toUpperCase() })
                : t('hero.kicker')}
            </Txt>
            <Txt style={[styles.heroTitle, { fontFamily: theme.font.display, color: c.text }]}>
              {t('hero.title.lead')}
              <Txt style={{ fontFamily: theme.font.display, color: c.accent, fontSize: 35 }}>
                {t('hero.title.accent')}
              </Txt>
            </Txt>
            {/* primary CTA — Home's one brand-gradient moment */}
            <Press
              onPress={() => snap('camera')}
              scaleTo={0.975}
              containerStyle={styles.stretch}
              style={[styles.snapCard, { backgroundColor: c.accent, shadowColor: c.accent }]}
            >
              <LinearGradient
                colors={theme.gradient.brand as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.snapGrad}
              >
                <View style={styles.snapIcon}>
                  <Feather name="camera" size={23} color="#fff" />
                </View>
                <View style={styles.flex}>
                  <Txt weight="bold" size={16.5} color="#fff">
                    {t('hero.snap.title')}
                  </Txt>
                  <Txt size={12.5} color="rgba(255,255,255,0.78)" style={styles.snapSub}>
                    {t('hero.snap.sub')}
                  </Txt>
                </View>
                <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            </Press>
            <Press
              onPress={() => snap('library')}
              hitSlop={8}
              containerStyle={styles.stretch}
              style={[styles.libBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <Feather name="image" size={16} color={c.accent} />
              <Txt weight="semibold" size={14} color={c.text}>
                {t('hero.library')}
              </Txt>
            </Press>
            <Txt size={13} color={c.textFaint} style={styles.orType}>
              {t('hero.examples')}
            </Txt>
            <View style={styles.examples}>
              {[
                '2x² + 5x − 3 = 0',
                'x² = x + 2',
                'x² − 4 > 0',
                '|x − 3| ≤ 2',
                'Triunghi dreptunghic cu catetele 6 și 8',
                'Aria cercului cu raza 5',
                'Triunghi cu laturile 5, 6, 7',
                '∫ x·eˣ dx',
                t('hero.example.derivative'),
              ].map((ex) => (
                <Press key={ex} onPress={() => sendText(ex)} style={[styles.chip, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Txt size={12.5} color={c.textMuted} style={{ fontFamily: theme.font.mono }}>
                    {ex}
                  </Txt>
                </Press>
              ))}
            </View>
          </ScrollView>
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

        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + 8 }]}>
          {netDown && (
            <ReAnimated.View entering={bubbleEnter} style={[styles.netBar, { backgroundColor: c.dangerSoft }]}>
              <Feather name="wifi-off" size={13} color={c.danger} />
              <Txt size={12} weight="semibold" color={c.danger}>
                {t('net.offline')}
              </Txt>
            </ReAnimated.View>
          )}
          {/* What you'll send, typeset — the same converter that renders it
              in the document, so the preview IS the result. */}
          {!!previewLatex && <MathPreview latex={previewLatex} label={t('composer.preview')} />}
          <SymbolBar onInsert={insertKey} />
          <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Press
              onPress={() => snap('camera')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.camera')}
              style={[styles.camBtn, { backgroundColor: c.accentSoft }]}
            >
              <Feather name="camera" size={18} color={c.accent} />
            </Press>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: c.text }]}
              placeholder={empty ? t('composer.placeholder.first') : t('composer.placeholder.followup')}
              placeholderTextColor={c.textFaint}
              value={input}
              onChangeText={(v) => {
                setInput(v)
                setSelection(undefined) // hand the caret back to the OS while typing
              }}
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
                  <Feather name="arrow-up" size={18} color={c.onAccent} />
                </LinearGradient>
              ) : (
                <View style={[styles.sendFill, { backgroundColor: c.surfaceAlt }]}>
                  <Feather name="arrow-up" size={18} color={c.textFaint} />
                </View>
              )}
            </Press>
          </View>
          {user?.isAnonymous ? (
            <Pressable onPress={signIn} hitSlop={6}>
              <Txt size={10.5} weight="semibold" color={c.accent} style={styles.disc}>
                {t('composer.guestCta')}
              </Txt>
            </Pressable>
          ) : (
            <Txt size={10} color={c.textFaint} style={[styles.disc, { fontFamily: theme.font.mono }]}>
              {t('composer.disclaimer')}
            </Txt>
          )}
        </View>
        </View>
      </KeyboardAvoidingView>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={loadProblem}
        // The open problem was deleted from history: unlink its stale id, or
        // every later persist would silently write into a dead document.
        onDeleted={(id) => {
          if (problemIdRef.current === id) problemIdRef.current = null
        }}
      />
      {/* The freemium moment: today's solves are done — sign in (guests) or
          go Premium. NO blurred steps anywhere; the cap is the only wall. */}
      <LimitSheet
        open={!!limitHit}
        kind={limitHit?.kind ?? 'solve'}
        limit={limitHit?.limit ?? 5}
        guest={limitHit?.guest ?? true}
        onClose={() => setLimitHit(null)}
        onPremium={() => {
          setLimitHit(null)
          setPaywallOpen(true)
        }}
      />
      <PaywallSheet open={paywallOpen} onClose={() => setPaywallOpen(false)} />
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
  stretch: { alignSelf: 'stretch' },
  // One content column, identical on every screen size: full width on phones,
  // capped and centered on wide/tablet screens (controls stay fixed-dp).
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  wordmark: { fontSize: 21, letterSpacing: -0.4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  accountSlot: { width: 38, height: 38 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    // same 38dp rhythm as every other header control — one visual row height
    height: 38,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
  },

  // hero (empty state)
  heroWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 20 },
  wm: { position: 'absolute', top: -6, right: -14, fontSize: 200, lineHeight: 210, opacity: 0.06 },
  kicker: { letterSpacing: 1.4 },
  heroTitle: { fontSize: 35, letterSpacing: -0.8, marginTop: 12, marginBottom: 28, textAlign: 'center' },
  snapCard: {
    alignSelf: 'stretch',
    borderRadius: 24,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  snapGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  snapIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  snapSub: { marginTop: 2 },
  libBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#1A1626',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  orType: { marginTop: 24 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 13,
    shadowColor: '#1A1626',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // composer
  composerWrap: { paddingHorizontal: 14, paddingTop: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 1,
    borderRadius: 26,
    paddingVertical: 7,
    paddingHorizontal: 7,
    shadowColor: '#1A1626',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  camBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 15.5, fontFamily: 'Inter_400Regular', maxHeight: 120, paddingVertical: 8, paddingTop: 9 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  sendFill: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stopSquare: { width: 11, height: 11, borderRadius: 2.5, backgroundColor: '#FFFFFF' },
  netBar: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    marginBottom: 8,
  },
  disc: { textAlign: 'center', marginTop: 7 },
})
