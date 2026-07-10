import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import CrossFade from '../components/ui/CrossFade'
import ScreenBackground from '../components/ui/ScreenBackground'
import { useToast } from '../components/ui/Toast'
import Txt from '../components/ui/Txt'
import SolutionView from '../components/ui/SolutionView'
import SymbolBar from '../components/ui/SymbolBar'
import { captureFromCamera, captureFromLibrary } from '../solve/capture'
import { solveImage, solveProblem, followUp } from '../solve/solve'
import type { ChatTurn } from '../ai/types'
import { useAuth } from '../auth/AuthProvider'
import { createProblem, updateProblemTurns, removeProblem, toStoredTurns, type Problem } from '../solve/store'
import SettingsModal from './SettingsModal'
import HistorySheet from './HistorySheet'

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

/** Map a raw error to a calm, human message. */
function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (/network|failed to fetch|timeout|timed out/i.test(raw))
    return "Couldn't reach the internet — check your connection and try again."
  if (/\b429\b|rate|quota|exhausted|resource_exhausted/i.test(raw))
    return "I'm a bit busy right now — give it a moment and try again."
  // 403 = the AI service refusing us (billing/permissions upstream), NOT the user's login.
  if (/\b403\b|permission.?denied|dunning/i.test(raw))
    return 'The AI service is unavailable right now — please try again later.'
  if (/\b401\b|not signed in|unauthenticated/i.test(raw)) return 'Please sign in again, then retry.'
  if (/\b50\d\b|unavailable|overloaded|high demand/i.test(raw))
    return 'The model is busy right now — please try again in a moment.'
  return 'Something went wrong solving that. Try again.'
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
        (st, i) => `${i + 1}. ${st.math ?? ''}${st.why ? `  (${st.why})` : ''}`,
      )
      if (j.answer) lines.push(`\nAnswer: ${j.answer}`)
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
  const toast = useToast()
  const [thread, setThread] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const threadRef = useRef<Turn[]>([])
  const problemIdRef = useRef<string | null>(null)
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
      toast.show(`Signed in as ${user.name ?? user.email}`)
    }
    wasAnonRef.current = user?.isAnonymous ?? false
  }, [user, toast])
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
      const stored = toStoredTurns(turns.filter((t) => !t.pending && !t.error))
      if (stored.length === 0) return
      const firstUser = turns.find((t) => t.role === 'user')
      const title = (firstUser?.text?.trim() || 'Photo problem').slice(0, 90)
      const topic = extractTopic(turns)
      try {
        if (problemIdRef.current) await updateProblemTurns(user.id, problemIdRef.current, stored)
        else problemIdRef.current = await createProblem(user.id, title, topic, stored)
      } catch {
        // ignore — persistence is best-effort
      }
    },
    [user],
  )

  const run = useCallback(
    async (userTurn: Turn, solver: () => Promise<string>) => {
      const asstId = uid()
      const base = threadRef.current
      commit([...base, userTurn, { id: asstId, role: 'assistant', text: '', pending: true }])
      setSending(true)
      scrollDown()
      try {
        const text = await solver()
        const done: Turn[] = [...base, userTurn, { id: asstId, role: 'assistant', text }]
        commit(done)
        persist(done)
      } catch (e) {
        commit([...base, userTurn, { id: asstId, role: 'assistant', text: friendlyError(e), error: true }])
      } finally {
        setSending(false)
        scrollDown()
      }
    },
    [commit, persist, scrollDown],
  )

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
      setInput('')
      const isFirst = threadRef.current.length === 0
      const turns: ChatTurn[] = [...priorTurns(), { role: 'user', text }]
      run({ id: uid(), role: 'user', text }, () => (isFirst ? solveProblem(text) : followUp(turns)))
    },
    [sending, run, priorTurns],
  )

  const reset = useCallback(() => {
    problemIdRef.current = null
    commit([])
  }, [commit])

  const loadProblem = useCallback(
    (p: Problem) => {
      problemIdRef.current = p.id
      commit(p.turns.map((t) => ({ id: uid(), role: t.role, text: t.text })))
      scrollDown()
    },
    [commit, scrollDown],
  )

  const handleChip = useCallback(
    (id: string) => {
      if (sending) return
      if (id === 'mistake') {
        // The saved problem is wrong input — remove it so history stays clean.
        if (user && problemIdRef.current) removeProblem(user.id, problemIdRef.current).catch(() => {})
        reset()
        return
      }
      if (id.startsWith('step:')) {
        const n = id.slice(5)
        run({ id: uid(), role: 'user', text: `Explain step ${n}` }, () =>
          followUp([...priorTurns(), { role: 'user', text: `Explain step ${n} again, more simply — I don't get that move.` }]),
        )
        return
      }
      run({ id: uid(), role: 'user', text: 'A similar problem' }, () =>
        followUp([
          ...priorTurns(),
          { role: 'user', text: 'Give me a similar problem to practice — just the problem, no solution.' },
        ]),
      )
    },
    [sending, run, reset, priorTurns, user],
  )

  const snap = useCallback(
    async (source: 'camera' | 'library') => {
      if (sending) return
      try {
        const img = await (source === 'camera' ? captureFromCamera() : captureFromLibrary())
        if (!img || !img.base64) return
        // A photo is always a NEW problem — one thread per problem keeps the
        // model accurate and history clean, so leave the previous thread behind.
        if (threadRef.current.length > 0) reset()
        run({ id: uid(), role: 'user', text: '', imageUri: img.uri }, () => solveImage(img))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not open the camera.'
        commit([...threadRef.current, { id: uid(), role: 'assistant', text: msg, error: true }])
      }
    },
    [sending, run, commit, reset],
  )

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
            <Pressable
              onPress={() => !sending && reset()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.newBtn,
                { borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather name="plus" size={15} color={c.accent} />
              <Txt weight="semibold" size={13} color={c.accent}>
                New
              </Txt>
            </Pressable>
          )}
          {/* Guests save work too (anonymous uid), so history is always available. */}
          <Pressable
            onPress={() => setHistoryOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.55 : 1 }]}
          >
            <Feather name="clock" size={19} color={c.textMuted} />
          </Pressable>
          {/* Account slot: FIXED 38px footprint in both states, so the swap
              never resizes the row and neighbours never move. */}
          <CrossFade dep={user?.isAnonymous ? 'guest' : 'account'} style={styles.accountSlot}>
            {user?.isAnonymous ? (
              // Guest: circular log-in button (same size as the avatar it becomes).
              <Pressable
                onPress={signIn}
                disabled={signingIn}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: c.accentSoft, borderColor: c.accent, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                {signingIn ? (
                  <ActivityIndicator size="small" color={c.accent} />
                ) : (
                  <Feather name="log-in" size={17} color={c.accent} />
                )}
              </Pressable>
            ) : (
              // Signed in: your avatar IS the account button — the visible proof
              // you're logged in. Falls back to the gear when there's no photo.
              <Pressable
                onPress={() => setSettingsOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.55 : 1 }]}
              >
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatar} />
                ) : (
                  <Feather name="settings" size={19} color={c.textMuted} />
                )}
              </Pressable>
            )}
          </CrossFade>
        </View>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={-insets.bottom}>
        <View style={styles.column}>
        {empty ? (
          <ScrollView
            contentContainerStyle={styles.heroWrap}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Txt size={11} color={c.textFaint} style={[styles.kicker, { fontFamily: theme.font.mono }]}>
              READY WHEN YOU ARE
            </Txt>
            <Txt style={[styles.heroTitle, { fontFamily: theme.font.serif, color: c.text }]}>
              What are we{' '}
              <Txt style={{ fontFamily: theme.font.serifItalic, color: c.accent, fontSize: 34 }}>
                solving?
              </Txt>
            </Txt>
            <Pressable
              onPress={() => snap('camera')}
              style={({ pressed }) => [
                styles.snapCard,
                { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View style={[styles.lens, { backgroundColor: c.accent }]}>
                <Feather name="camera" size={25} color="#fff" />
              </View>
              <Txt weight="bold" size={16}>
                Snap a problem
              </Txt>
              <Txt size={13} color={c.textMuted} style={styles.snapSub}>
                Point at anything — printed or handwritten.
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => snap('library')}
              hitSlop={8}
              style={({ pressed }) => [styles.libBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="image" size={15} color={c.accent} />
              <Txt weight="semibold" size={13.5} color={c.accent}>
                Choose from library
              </Txt>
            </Pressable>
            <Txt size={13} color={c.textFaint} style={styles.orType}>
              …or tap an example
            </Txt>
            <View style={styles.examples}>
              {['2x² + 5x − 3 = 0', '∫ x·eˣ dx', 'derivative of x²·sin(x)'].map((ex) => (
                <Pressable
                  key={ex}
                  onPress={() => sendText(ex)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Txt size={12.5} color={c.textMuted} style={{ fontFamily: theme.font.mono }}>
                    {ex}
                  </Txt>
                </Pressable>
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
            onContentSizeChange={scrollDown}
          >
            {thread.map((t) => (
              <Bubble key={t.id} turn={t} onChip={handleChip} />
            ))}
          </ScrollView>
        )}

        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + 8 }]}>
          <SymbolBar onInsert={(s) => setInput((v) => v + s)} />
          <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Pressable
              onPress={() => snap('camera')}
              hitSlop={6}
              style={({ pressed }) => [styles.camBtn, { backgroundColor: c.accentSoft, opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="camera" size={18} color={c.accent} />
            </Pressable>
            <TextInput
              style={[styles.input, { color: c.text }]}
              placeholder={empty ? 'Type a problem…' : 'Ask about this problem…'}
              placeholderTextColor={c.textFaint}
              value={input}
              onChangeText={setInput}
              multiline
              maxFontSizeMultiplier={1.2}
            />
            <Pressable
              onPress={() => sendText(input)}
              disabled={!input.trim() || sending}
              hitSlop={6}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: input.trim() && !sending ? c.accent : c.surfaceAlt, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="arrow-up" size={18} color={input.trim() && !sending ? c.onAccent : c.textFaint} />
            </Pressable>
          </View>
          {user?.isAnonymous ? (
            <Pressable onPress={signIn} hitSlop={6}>
              <Txt size={10.5} weight="semibold" color={c.accent} style={styles.disc}>
                Sign in to keep your work — it takes 5 seconds
              </Txt>
            </Pressable>
          ) : (
            <Txt size={10} color={c.textFaint} style={[styles.disc, { fontFamily: theme.font.mono }]}>
              Verify important answers — AI can make mistakes.
            </Txt>
          )}
        </View>
        </View>
      </KeyboardAvoidingView>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={loadProblem} />
    </ScreenBackground>
  )
}

function Bubble({ turn, onChip }: { turn: Turn; onChip?: (id: string) => void }) {
  const { theme } = useTheme()
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
        <PendingRow />
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
        <SolutionView content={turn.text} onChip={onChip} />
        {!isErrorResult(turn.text) && (
          <View style={[styles.asstActions, { borderColor: c.border }]}>
            <Pressable
              onPress={() => Clipboard.setStringAsync(solutionText(turn.text))}
              hitSlop={6}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="copy" size={14} color={c.textMuted} />
              <Txt size={12.5} weight="semibold" color={c.textMuted}>
                Copy
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => Share.share({ message: solutionText(turn.text) })}
              hitSlop={6}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="share-2" size={14} color={c.textMuted} />
              <Txt size={12.5} weight="semibold" color={c.textMuted}>
                Share
              </Txt>
            </Pressable>
          </View>
        )}
      </View>
    )
  }
  return <Animated.View style={wrap}>{inner}</Animated.View>
}

// Rotating status while the model works — honest about the stages and makes the
// (reasoning-model) wait feel alive instead of a silent spinner.
const PENDING_STAGES = ['Reading the problem…', 'Working the steps…', 'Double-checking the answer…']

function PendingRow() {
  const { theme } = useTheme()
  const c = theme.colors
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, PENDING_STAGES.length - 1)), 3500)
    return () => clearInterval(t)
  }, [])
  return (
    <View style={styles.pendingRow}>
      <ActivityIndicator color={c.accent} />
      <Txt size={13.5} color={c.textMuted}>
        {PENDING_STAGES[stage]}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
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
