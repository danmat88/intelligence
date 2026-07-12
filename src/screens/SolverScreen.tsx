import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Animated, Image, Keyboard, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
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
import SolutionView, { type VerifyStage } from '../components/ui/SolutionView'
import ThreadDocument, { type DocLabels } from '../components/ui/ThreadDocument'
import SymbolBar from '../components/ui/SymbolBar'
import type { CapturedImage } from '../solve/capture'
import { solveImage, solveProblem, followUp, solveDeep, verifyAnswer } from '../solve/solve'
import { solutionShareText } from '../solve/shareText'
import { getSolveJson, isStructuredSolution, withJsonFlags } from '../solve/verdict'
import type { ChatTurn } from '../ai/types'
import { useI18n, type StringKey } from '../i18n'
import { useAuth } from '../auth/AuthProvider'
import { createProblem, updateProblemTurns, removeProblem, toStoredTurns, type Problem } from '../solve/store'
import SettingsModal from './SettingsModal'
import HistorySheet from './HistorySheet'
import CaptureScreen from './CaptureScreen'

type Turn = {
  id: string
  role: 'user' | 'assistant'
  text: string
  imageUri?: string
  pending?: boolean
  error?: boolean
}

let counter = 0
const uid = () => `${Date.now()}_${counter++}`

/** Pull the topic label out of a structured (JSON) solution, if present. */
function extractTopic(thread: { role: string; text: string }[]): string | null {
  const a = thread.find((t) => t.role === 'assistant' && t.text)
  if (!a) return null
  try {
    const s = a.text.indexOf('{')
    const e = a.text.lastIndexOf('}')
    if (s >= 0 && e > s) {
      const j = JSON.parse(a.text.slice(s, e + 1)) as { topic?: unknown }
      return typeof j.topic === 'string' ? j.topic : null
    }
  } catch {
    // not JSON (a follow-up) — no topic
  }
  return null
}

/** True if a solve response is the {"error": ...} shape (non-math / unreadable). */
function isErrorResult(text: string): boolean {
  try {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s >= 0 && e > s) {
      const j = JSON.parse(text.slice(s, e + 1)) as { error?: unknown }
      return typeof j.error === 'string'
    }
  } catch {
    // not JSON
  }
  return false
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
  const { user, signIn, signingIn, error: authError } = useAuth()
  const { t, langName } = useI18n()
  const toast = useToast()
  const [thread, setThread] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // The in-app capture flow (camera visor / gallery pick + trim).
  const [capture, setCapture] = useState<'camera' | 'library' | null>(null)
  // Turn-ids being machine-checked right now, with their stage: 'check' =
  // first pass, 'recheck' = the honest "re-solving carefully" beat while the
  // deep model recomputes a failed answer.
  const [verifyingMap, setVerifyingMap] = useState<Record<string, 'check' | 'recheck'>>({})
  // Trust explainer opened by tapping the ✓/! badge on an answer box.
  const [verifyInfo, setVerifyInfo] = useState<'verified' | 'unverified' | null>(null)
  const inputRef = useRef<TextInput>(null)
  const threadRef = useRef<Turn[]>([])
  const problemIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevUidRef = useRef<string | undefined>(user?.id)
  // Whether the current document shows a LOADED conversation (renders all at
  // once, no entrances) vs a live one (new blocks reveal). The page handles
  // scroll (top for reading, follow for live) internally.
  const coldDocRef = useRef(false)
  // The last request, kept so a failed turn can be retried without retyping.
  const lastReqRef = useRef<{ userTurn: Turn; solver: (s: AbortSignal) => Promise<string>; verifyProblem?: string } | null>(null)
  // Chip bulletproofing: debounce accidental double-taps, and count how many
  // times each step was explained so re-taps escalate instead of repeating.
  const lastChipRef = useRef<{ id: string; at: number }>({ id: '', at: 0 })
  const explainCountsRef = useRef<Record<string, number>>({})
  // Event-driven offline pill: raised by a network-classified failure,
  // cleared by the next successful answer.
  const [netDown, setNetDown] = useState(false)
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
      // A solve in flight belongs to the OLD account — kill it, or its answer
      // would commit into the fresh session.
      abortRef.current?.abort()
      abortRef.current = null
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
      // Never save a non-math / unreadable result — it would just clutter history.
      const lastAsst = [...turns].reverse().find((t) => t.role === 'assistant')
      if (lastAsst && isErrorResult(lastAsst.text)) return
      // Failed/pending turns are UI state, not part of the problem — drop them.
      const stored = toStoredTurns(
        turns.filter((x) => !x.pending && !x.error),
        t('turn.photoProblem'),
      )
      if (stored.length === 0) return
      const firstUser = turns.find((x) => x.role === 'user')
      // Multi-line input must not produce multi-line history titles.
      const title = (firstUser?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 90) || t('turn.photoProblem')
      const topic = extractTopic(turns)
      try {
        if (problemIdRef.current) await updateProblemTurns(user.id, problemIdRef.current, stored)
        else problemIdRef.current = await createProblem(user.id, title, topic, stored)
      } catch {
        // ignore — persistence is best-effort
      }
    },
    [user, t],
  )

  // The correctness engine: machine-check the shown answer in the background;
  // on a failed check, silently re-solve with the deep model and swap in the
  // corrected solution. The "✓" badge only ever comes from a real code check.
  const verifyFlow = useCallback(
    async (id: string, problemText: string) => {
      setVerifyingMap((m) => ({ ...m, [id]: 'check' }))
      const applyText = (text: string) => {
        commit(threadRef.current.map((x) => (x.id === id ? { ...x, text } : x)))
      }
      try {
        const turn = threadRef.current.find((x) => x.id === id)
        if (!turn) return
        const v = await verifyAnswer(problemText, turn.text)
        if (v === 'correct') {
          applyText(withJsonFlags(turn.text, { _verified: true }))
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        } else if (v === 'incorrect') {
          const j = getSolveJson(turn.text)
          const prob = String(j?.problem ?? '').trim() || problemText.trim()
          if (j?._model !== 'deep' && prob) {
            // Be honest about the extra work — the pill says "re-solving".
            setVerifyingMap((m) => ({ ...m, [id]: 'recheck' }))
            const deepRaw = await solveDeep(prob, langName)
            const v2 = isStructuredSolution(deepRaw) ? await verifyAnswer(prob, deepRaw) : 'unverifiable'
            applyText(
              v2 === 'correct'
                ? withJsonFlags(deepRaw, { _verified: true })
                : v2 === 'incorrect'
                  ? withJsonFlags(deepRaw, { _verified: false })
                  : deepRaw,
            )
          } else {
            applyText(withJsonFlags(turn.text, { _verified: false }))
          }
        }
        // 'unverifiable' → no badge, no warning; the solution stands as-is.
        persist(threadRef.current)
      } catch {
        // verification is best-effort — never disturb the shown solution
      } finally {
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
    async (userTurn: Turn, solver: (signal: AbortSignal) => Promise<string>, verifyProblem?: string) => {
      const asstId = uid()
      const base = threadRef.current
      const ctrl = new AbortController()
      abortRef.current = ctrl
      lastReqRef.current = { userTurn, solver, verifyProblem } // retry fuel
      coldDocRef.current = false // live turns reveal in the document
      commit([...base, userTurn, { id: asstId, role: 'assistant', text: '', pending: true }])
      setSending(true)
      try {
        const text = await solver(ctrl.signal)
        if (ctrl.signal.aborted) return
        const done: Turn[] = [...base, userTurn, { id: asstId, role: 'assistant', text }]
        commit(done)
        persist(done)
        setNetDown(false) // an answer arrived — the network is clearly back
        // First solves get the background correctness check (not follow-ups).
        if (verifyProblem !== undefined && isStructuredSolution(text)) void verifyFlow(asstId, verifyProblem)
      } catch (e) {
        if (ctrl.signal.aborted) {
          // User cancelled — quietly drop the attempt, back to where they were.
          commit(base)
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
    run(req.userTurn, req.solver, req.verifyProblem)
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
      run(
        { id: uid(), role: 'user', text },
        (sig) => (isFirst ? solveProblem(text, langName, sig) : followUp(turns, langName, sig)),
        isFirst ? text : undefined, // machine-check first solves only
      )
    },
    [sending, run, priorTurns, langName],
  )

  const reset = useCallback(() => {
    Keyboard.dismiss() // fresh problem, fresh screen — no keyboard left over the hero
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
      // or its answer would overwrite the freshly loaded thread.
      if (sending) cancelRun()
      Haptics.selectionAsync().catch(() => {})
      // Choreography: the sheet starts sliding away, and mid-exit the thread
      // PUSH begins — old conversation slides out, the new one slides in as
      // one surface carrying its inert cards. WebViews light up on landing.
      setTimeout(() => {
        problemIdRef.current = p.id
        const turns = p.turns.map((t) => ({ id: uid(), role: t.role, text: t.text }))
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
        // The saved problem is wrong input — remove it so history stays clean.
        if (user && problemIdRef.current) removeProblem(user.id, problemIdRef.current).catch(() => {})
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
          followUp([...priorTurns(), { role: 'user', text: ask }], langName, sig),
        )
        return
      }
      run({ id: uid(), role: 'user', text: t('turn.similar') }, (sig) =>
        followUp(
          [...priorTurns(), { role: 'user', text: 'Give me a similar problem to practice — just the problem, no solution.' }],
          langName,
          sig,
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
      // '' → the verifier reads the problem from the solution's own restatement
      run({ id: uid(), role: 'user', text: '', imageUri: img.uri }, (sig) => solveImage(img, langName, sig), '')
    },
    [run, reset, langName],
  )

  const typeInstead = useCallback(() => {
    setCapture(null)
    // focus once the visor has slid away, so the keyboard rises over Home
    setTimeout(() => inputRef.current?.focus(), 280)
  }, [])

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
      copy: t('action.copy'),
      share: t('action.share'),
      solution: t('solution.label'),
      answer: t('solution.answer'),
      graph: t('solution.graph'),
      similar: t('solution.chip.similar'),
      mistake: t('solution.chip.mistake'),
      verifying: t('solution.verifying'),
      reverifying: t('solution.reverifying'),
      verified: t('solution.verified'),
      unverified: t('solution.unverified'),
      unverifiedPill: t('solution.unverified.pill'),
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
              // Guest: circular log-in button (same size as the avatar it becomes).
              <Press
                onPress={signIn}
                disabled={signingIn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('auth.signIn')}
                style={[styles.iconBtn, { backgroundColor: c.accentSoft, borderColor: c.accent }]}
              >
                {signingIn ? (
                  <ActivityIndicator size="small" color={c.accent} />
                ) : (
                  <Feather name="log-in" size={17} color={c.accent} />
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
              {['2x² + 5x − 3 = 0', '∫ x·eˣ dx', t('hero.example.derivative')].map((ex) => (
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
            onVerifyTap={setVerifyInfo}
            onRetry={retryLast}
            onCancel={cancelRun}
            onAction={handleDocAction}
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
          <SymbolBar onInsert={(s) => setInput((v) => v + s)} />
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
              onChangeText={setInput}
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
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={loadProblem} />
      {/* The trust pitch, told at the moment of trust: what "Verified" means. */}
      <InfoDialog
        open={verifyInfo !== null}
        tone={verifyInfo === 'unverified' ? 'warning' : 'success'}
        title={verifyInfo === 'unverified' ? t('verify.info.title.warn') : t('verify.info.title.ok')}
        message={verifyInfo === 'unverified' ? t('verify.info.body.warn') : t('verify.info.body.ok')}
        okLabel={t('common.ok')}
        onClose={() => setVerifyInfo(null)}
      />
      <CaptureScreen open={capture} onClose={() => setCapture(null)} onUsePhoto={solvePhoto} onTypeInstead={typeInstead} />
    </ScreenBackground>
  )
}

function Bubble({
  turn,
  animate = true,
  mountDelay = 0,
  onChip,
  onCancel,
  onRetry,
  onVerifyTap,
  verifying = false,
}: {
  turn: Turn
  /** False for history-loaded turns: no entrance, cards land at full size. */
  animate?: boolean
  /** WebView hold-back for loaded turns (covers the hero→thread push only). */
  mountDelay?: number
  onChip?: (id: string) => void
  onCancel?: () => void
  /** Present on error turns: re-run the failed request, nothing retyped. */
  onRetry?: () => void
  onVerifyTap?: (state: 'verified' | 'unverified') => void
  verifying?: VerifyStage
}) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const toast = useToast()
  const c = theme.colors

  let inner: ReactNode
  if (turn.role === 'user') {
    inner = (
      <LinearGradient
        colors={theme.gradient.brand as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        // Photo-only bubbles wear the image edge-to-edge (thin gradient frame).
        style={[styles.userBubble, !!turn.imageUri && !turn.text && styles.userBubblePhoto]}
      >
        {!!turn.imageUri && <Image source={{ uri: turn.imageUri }} style={styles.userImg} resizeMode="cover" />}
        {!!turn.text && (
          <Txt size={15} color={c.onAccent}>
            {turn.text}
          </Txt>
        )}
      </LinearGradient>
    )
  } else if (turn.pending) {
    inner = (
      <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <PendingRow onCancel={onCancel} />
      </View>
    )
  } else if (turn.error) {
    inner = (
      <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.danger }]}>
        <View style={styles.errRow}>
          <Feather name="alert-circle" size={16} color={c.danger} style={styles.errIcon} />
          <Txt size={14} color={c.danger} style={styles.flex}>
            {turn.text}
          </Txt>
        </View>
        {onRetry && (
          <Press onPress={onRetry} scaleTo={0.96} style={[styles.retryBtn, { backgroundColor: c.accentSoft }]}>
            <Feather name="rotate-ccw" size={13} color={c.accent} />
            <Txt size={12.5} weight="semibold" color={c.accent}>
              {t('err.retry')}
            </Txt>
          </Press>
        )}
      </View>
    )
  } else {
    inner = (
      <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <SolutionView
          content={turn.text}
          onChip={onChip}
          onVerifyTap={onVerifyTap}
          reveal={animate}
          mountDelay={mountDelay}
          verifying={verifying}
          labels={{
            solution: t('solution.label'),
            answer: t('solution.answer'),
            graph: t('solution.graph'),
            similar: t('solution.chip.similar'),
            mistake: t('solution.chip.mistake'),
            verifying: t('solution.verifying'),
            reverifying: t('solution.reverifying'),
            verified: t('solution.verified'),
            unverified: t('solution.unverified'),
            unverifiedPill: t('solution.unverified.pill'),
          }}
        />
        {!isErrorResult(turn.text) && (
          <View style={styles.asstActions}>
            <Press
              onPress={() => {
                Clipboard.setStringAsync(
                  solutionShareText(turn.text, {
                    problem: t('share.problem'),
                    answer: t('solution.answer'),
                    signature: t('share.signature'),
                  }),
                )
                Haptics.selectionAsync().catch(() => {})
                toast.show(t('action.copied'), 'check') // silent copy = broken copy
              }}
              hitSlop={6}
              scaleTo={0.95}
              style={[styles.actionBtn, { backgroundColor: c.surfaceAlt }]}
            >
              <Feather name="copy" size={13} color={c.textMuted} />
              <Txt size={12.5} weight="semibold" color={c.textMuted}>
                {t('action.copy')}
              </Txt>
            </Press>
            <Press
              onPress={() =>
                Share.share({
                  message: solutionShareText(turn.text, {
                    problem: t('share.problem'),
                    answer: t('solution.answer'),
                    signature: t('share.signature'),
                  }),
                })
              }
              hitSlop={6}
              scaleTo={0.95}
              style={[styles.actionBtn, { backgroundColor: c.surfaceAlt }]}
            >
              <Feather name="share-2" size={13} color={c.textMuted} />
              <Txt size={12.5} weight="semibold" color={c.textMuted}>
                {t('action.share')}
              </Txt>
            </Press>
          </View>
        )}
      </View>
    )
  }
  // UI-thread entrance: a live turn rises from behind the composer, fully
  // opaque; loaded history lands already in place.
  return <ReAnimated.View entering={animate ? bubbleEnter : undefined}>{inner}</ReAnimated.View>
}

const BUBBLE_EASE = REasing.bezier(0.22, 1, 0.36, 1)
function bubbleEnter(v: EntryAnimationsValues) {
  'worklet'
  return {
    initialValues: { originY: v.targetOriginY + 56 },
    animations: { originY: withTiming(v.targetOriginY, { duration: 480, easing: BUBBLE_EASE }) },
  }
}

// Elapsed-aware status while the model works: honest stages early on, and past
// ~20s an explicit "this one is tougher" so a long solve reads as intentional
// effort, not a hang — plus a cancel escape hatch.
function PendingRow({ onCancel }: { onCancel?: () => void }) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const c = theme.colors
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - started), 1000)
    return () => clearInterval(id)
  }, [])
  const label =
    elapsed < 4000 ? t('pending.1') : elapsed < 10000 ? t('pending.2') : elapsed < 22000 ? t('pending.3') : t('pending.4')
  return (
    <View>
      <View style={styles.pendingWrap}>
        <View style={styles.pendingRow}>
          <ActivityIndicator color={c.accent} />
          <Txt size={13.5} color={c.textMuted} style={styles.flex}>
            {label}
          </Txt>
        </View>
        {onCancel && elapsed >= 5000 && (
          <Pressable onPress={onCancel} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Txt size={12.5} weight="semibold" color={c.textFaint}>
              {t('pending.cancel')}
            </Txt>
          </Pressable>
        )}
      </View>
      <SkeletonSteps />
    </View>
  )
}

/** Ghost of the incoming solution — pulsing step lines + an answer block. The
 *  longest moment in the app should look like work happening, not a stall. */
function SkeletonSteps() {
  const { theme } = useTheme()
  const c = theme.colors
  const pulse = useRef(new Animated.Value(0.35)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])
  return (
    <Animated.View style={[styles.skel, { opacity: pulse }]}>
      <View style={[styles.skelBar, { width: '86%', backgroundColor: c.surfaceAlt }]} />
      <View style={[styles.skelBar, { width: '70%', backgroundColor: c.surfaceAlt }]} />
      <View style={[styles.skelBar, { width: '55%', backgroundColor: c.surfaceAlt }]} />
      <View style={[styles.skelAnswer, { backgroundColor: c.successSoft }]} />
    </Animated.View>
  )
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

  // thread
  thread: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 14 },
  threadMetaWrap: { alignItems: 'center', paddingTop: 2, paddingBottom: 2 },
  threadMetaPill: { borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 13 },
  jumpWrap: { position: 'absolute', right: 16, bottom: 14 },
  jumpBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1626',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 15,
    gap: 8,
  },
  userBubblePhoto: { paddingVertical: 5, paddingHorizontal: 5 },
  userImg: { width: 210, height: 156, borderRadius: 15 },
  asstCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#1A1626',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  errRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  errIcon: { marginTop: 2 },
  retryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  pendingWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  asstActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
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

  // pending skeleton
  skel: { marginTop: 13, gap: 9 },
  skelBar: { height: 13, borderRadius: 7 },
  skelAnswer: { height: 30, width: '46%', borderRadius: 10, marginTop: 4 },
})
