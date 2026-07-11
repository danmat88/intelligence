import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Animated, Image, Keyboard, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
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
import SolutionView from '../components/ui/SolutionView'
import SymbolBar from '../components/ui/SymbolBar'
import type { CapturedImage } from '../solve/capture'
import { solveImage, solveProblem, followUp, solveDeep, verifyAnswer } from '../solve/solve'
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

/** Readable-ify LaTeX for plain-text sharing (√ instead of \sqrt etc.). */
function deTeXShare(s: string): string {
  return s
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\int/g, '∫')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq?/g, '≠')
    .replace(/\\pm/g, '±')
    .replace(/\\infty/g, '∞')
    .replace(/\\[a-zA-Z]+/g, (m) => m.slice(1))
    .replace(/[{}]/g, '')
}

/** Flatten a structured solution (or follow-up) into shareable plain text. */
function solutionText(raw: string): string {
  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s >= 0 && e > s) {
      const j = JSON.parse(raw.slice(s, e + 1)) as {
        error?: string
        steps?: { math?: string; why?: string }[]
        answer?: string
      }
      if (j.error) return j.error
      const lines = (j.steps ?? []).map(
        (st, i) => `${i + 1}. ${deTeXShare(st.math ?? '')}${st.why ? `  (${deTeXShare(st.why)})` : ''}`,
      )
      if (j.answer) lines.push(`\nAnswer: ${deTeXShare(j.answer)}`)
      if (lines.length) return lines.join('\n')
    }
  } catch {
    // not JSON — a follow-up in markdown
  }
  return raw
}

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
  // Turn-ids whose answers are being machine-checked right now (badge pending).
  const [verifyingMap, setVerifyingMap] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const threadRef = useRef<Turn[]>([])
  const problemIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const prevUidRef = useRef<string | undefined>(user?.id)
  const empty = thread.length === 0

  // If the account changes mid-session (guest link fell back to an existing
  // Google account = new uid), the open problem's doc id belongs to the old
  // account — drop it so the next persist re-creates it under the new uid.
  useEffect(() => {
    if (prevUidRef.current !== user?.id) {
      prevUidRef.current = user?.id
      problemIdRef.current = null
    }
  }, [user?.id])

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

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
  }, [])

  // Keep a ref mirror of the thread so async solves persist the right snapshot.
  const commit = useCallback((next: Turn[]) => {
    threadRef.current = next
    setThread(next)
  }, [])

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
      const title = (firstUser?.text?.trim() || t('turn.photoProblem')).slice(0, 90)
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
      setVerifyingMap((m) => ({ ...m, [id]: true }))
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
      commit([...base, userTurn, { id: asstId, role: 'assistant', text: '', pending: true }])
      setSending(true)
      scrollDown()
      try {
        const text = await solver(ctrl.signal)
        if (ctrl.signal.aborted) return
        const done: Turn[] = [...base, userTurn, { id: asstId, role: 'assistant', text }]
        commit(done)
        persist(done)
        // First solves get the background correctness check (not follow-ups).
        if (verifyProblem !== undefined && isStructuredSolution(text)) void verifyFlow(asstId, verifyProblem)
      } catch (e) {
        if (ctrl.signal.aborted) {
          // User cancelled — quietly drop the attempt, back to where they were.
          commit(base)
          return
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
        commit([...base, userTurn, { id: asstId, role: 'assistant', text: friendlyError(e, t), error: true }])
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        setSending(false)
        scrollDown()
      }
    },
    [commit, persist, scrollDown, t, verifyFlow],
  )

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
    // abort may not reject an in-flight fetch immediately on RN — clear the UI now
    const base = threadRef.current.filter((x) => !x.pending)
    commit(base.length && base[base.length - 1].role === 'user' ? base.slice(0, -1) : base)
    setSending(false)
  }, [commit])

  const priorTurns = useCallback(
    (): ChatTurn[] =>
      threadRef.current
        .filter((t) => !t.pending && !t.error)
        .map((t) => ({ role: t.role, text: t.text || 'Here is my problem (in the image I sent).' })),
    [],
  )

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
    commit([])
  }, [commit])

  const loadProblem = useCallback(
    (p: Problem) => {
      Keyboard.dismiss()
      problemIdRef.current = p.id
      commit(p.turns.map((t) => ({ id: uid(), role: t.role, text: t.text })))
      scrollDown()
    },
    [commit, scrollDown],
  )

  const handleChip = useCallback(
    (id: string) => {
      if (sending) return
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
        run({ id: uid(), role: 'user', text: t('turn.explainStep', { n }) }, (sig) =>
          followUp(
            [...priorTurns(), { role: 'user', text: `Explain step ${n} again, more simply — I don't get that move.` }],
            langName,
            sig,
          ),
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
    [sending, run, reset, priorTurns, user, t, langName],
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

  return (
    <ScreenBackground>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerInner}>
        <Txt style={[styles.wordmark, { fontFamily: theme.font.serif, color: c.text }]}>
          Rezolv
          <Txt style={{ fontFamily: theme.font.serifItalic, color: c.accent, fontSize: 20 }}>o</Txt>
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
        {/* Hero ↔ thread swaps cross-fade — screens never hard-cut. */}
        <CrossFade dep={empty ? 'hero' : 'thread'} style={styles.flex}>
        {empty ? (
          <ScrollView
            contentContainerStyle={styles.heroWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Txt size={11} color={c.textFaint} style={[styles.kicker, { fontFamily: theme.font.mono }]}>
              {t('hero.kicker')}
            </Txt>
            <Txt style={[styles.heroTitle, { fontFamily: theme.font.serif, color: c.text }]}>
              {t('hero.title.lead')}
              <Txt style={{ fontFamily: theme.font.serifItalic, color: c.accent, fontSize: 34 }}>
                {t('hero.title.accent')}
              </Txt>
            </Txt>
            <Press
              onPress={() => snap('camera')}
              scaleTo={0.975}
              containerStyle={styles.stretch}
              style={[styles.snapCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={[styles.lens, { backgroundColor: c.accent }]}>
                <Feather name="camera" size={25} color="#fff" />
              </View>
              <Txt weight="bold" size={16}>
                {t('hero.snap.title')}
              </Txt>
              <Txt size={13} color={c.textMuted} style={styles.snapSub}>
                {t('hero.snap.sub')}
              </Txt>
            </Press>
            <Press onPress={() => snap('library')} hitSlop={8} style={styles.libBtn}>
              <Feather name="image" size={15} color={c.accent} />
              <Txt weight="semibold" size={13.5} color={c.accent}>
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
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={scrollDown}
          >
            {thread.map((x) => (
              <Bubble key={x.id} turn={x} onChip={handleChip} onCancel={cancelRun} verifying={!!verifyingMap[x.id]} />
            ))}
          </ScrollView>
        )}
        </CrossFade>

        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + 8 }]}>
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
            <Press
              onPress={() => sendText(input)}
              disabled={!input.trim() || sending}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.send')}
              style={[styles.sendBtn, { backgroundColor: input.trim() && !sending ? c.accent : c.surfaceAlt }]}
            >
              <Feather name="arrow-up" size={18} color={input.trim() && !sending ? c.onAccent : c.textFaint} />
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
      <CaptureScreen open={capture} onClose={() => setCapture(null)} onUsePhoto={solvePhoto} onTypeInstead={typeInstead} />
    </ScreenBackground>
  )
}

function Bubble({
  turn,
  onChip,
  onCancel,
  verifying = false,
}: {
  turn: Turn
  onChip?: (id: string) => void
  onCancel?: () => void
  verifying?: boolean
}) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const c = theme.colors
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start()
  }, [anim])
  const wrap = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  }

  let inner: ReactNode
  if (turn.role === 'user') {
    inner = (
      <View style={[styles.userBubble, { backgroundColor: c.accent }]}>
        {!!turn.imageUri && <Image source={{ uri: turn.imageUri }} style={styles.userImg} resizeMode="cover" />}
        {!!turn.text && (
          <Txt size={15} color={c.onAccent}>
            {turn.text}
          </Txt>
        )}
      </View>
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
        <Txt size={14} color={c.danger}>
          {turn.text}
        </Txt>
      </View>
    )
  } else {
    inner = (
      <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <SolutionView
          content={turn.text}
          onChip={onChip}
          verifying={verifying}
          labels={{
            solution: t('solution.label'),
            answer: t('solution.answer'),
            graph: t('solution.graph'),
            similar: t('solution.chip.similar'),
            mistake: t('solution.chip.mistake'),
            verifying: t('solution.verifying'),
            verified: t('solution.verified'),
            unverified: t('solution.unverified'),
          }}
        />
        {!isErrorResult(turn.text) && (
          <View style={[styles.asstActions, { borderColor: c.border }]}>
            <Pressable
              onPress={() => Clipboard.setStringAsync(solutionText(turn.text))}
              hitSlop={6}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="copy" size={14} color={c.textMuted} />
              <Txt size={12.5} weight="semibold" color={c.textMuted}>
                {t('action.copy')}
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => Share.share({ message: solutionText(turn.text) })}
              hitSlop={6}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="share-2" size={14} color={c.textMuted} />
              <Txt size={12.5} weight="semibold" color={c.textMuted}>
                {t('action.share')}
              </Txt>
            </Pressable>
          </View>
        )}
      </View>
    )
  }
  return <Animated.View style={wrap}>{inner}</Animated.View>
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
  wordmark: { fontSize: 20, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  accountSlot: { width: 38, height: 38 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },

  // hero (empty state)
  heroWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 20 },
  kicker: { letterSpacing: 1.4 },
  heroTitle: { fontSize: 34, marginTop: 12, marginBottom: 28, textAlign: 'center' },
  snapCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 22,
    shadowColor: '#141922',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  lens: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  snapSub: { marginTop: 5, textAlign: 'center' },
  libBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, padding: 6 },
  orType: { marginTop: 22 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13 },

  // thread
  thread: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 14 },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingVertical: 11,
    paddingHorizontal: 15,
    gap: 8,
  },
  userImg: { width: 200, height: 150, borderRadius: 12 },
  asstCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#141922',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pendingWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  asstActions: { flexDirection: 'row', gap: 20, marginTop: 10, paddingTop: 11, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },

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
    shadowColor: '#141922',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  camBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 15.5, fontFamily: 'Inter_400Regular', maxHeight: 120, paddingVertical: 8, paddingTop: 9 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  disc: { textAlign: 'center', marginTop: 7 },
})
