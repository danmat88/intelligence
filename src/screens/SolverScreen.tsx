import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeProvider'
import ScreenBackground from '../components/ui/ScreenBackground'
import Txt from '../components/ui/Txt'
import SolutionView from '../components/ui/SolutionView'
import { captureFromCamera, captureFromLibrary } from '../solve/capture'
import { solveImage, solveProblem, followUp } from '../solve/solve'
import type { ChatTurn } from '../ai/types'
import { useAuth } from '../auth/AuthProvider'
import { createProblem, updateProblemTurns, toStoredTurns, type Problem } from '../solve/store'
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
  const { user } = useAuth()
  const [thread, setThread] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const threadRef = useRef<Turn[]>([])
  const problemIdRef = useRef<string | null>(null)
  const empty = thread.length === 0

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
      const stored = toStoredTurns(turns)
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
        const msg = e instanceof Error ? e.message : 'Something went wrong. Try again.'
        commit([...base, userTurn, { id: asstId, role: 'assistant', text: msg, error: true }])
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
        reset()
        return
      }
      const ask =
        id === 'explain'
          ? 'Explain the trickiest step again, more simply.'
          : 'Give me a similar problem to practice — just the problem, no solution.'
      run({ id: uid(), role: 'user', text: id === 'explain' ? 'Explain a step' : 'A similar problem' }, () =>
        followUp([...priorTurns(), { role: 'user', text: ask }]),
      )
    },
    [sending, run, reset, priorTurns],
  )

  const snap = useCallback(
    async (source: 'camera' | 'library') => {
      if (sending) return
      try {
        const img = await (source === 'camera' ? captureFromCamera() : captureFromLibrary())
        if (!img || !img.base64) return
        run({ id: uid(), role: 'user', text: '', imageUri: img.uri }, () => solveImage(img))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not open the camera.'
        commit([...threadRef.current, { id: uid(), role: 'assistant', text: msg, error: true }])
      }
    },
    [sending, run, commit],
  )

  return (
    <ScreenBackground>
      <StatusBar style="dark" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt style={[styles.wordmark, { fontFamily: theme.font.serif, color: c.text }]}>
          Intelli
          <Txt style={{ fontFamily: theme.font.serif, color: c.accent, fontSize: 20 }}>·</Txt>
          Math
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
          <Pressable
            onPress={() => setHistoryOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.gearBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="clock" size={19} color={c.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.gearBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="settings" size={19} color={c.textMuted} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={-insets.bottom}>
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
              …or type an equation below
            </Txt>
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
          <Txt size={10.5} color={c.textFaint} style={styles.disc}>
            Verify important answers — AI can make mistakes.
          </Txt>
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

  if (turn.role === 'user') {
    return (
      <View style={[styles.userBubble, { backgroundColor: c.accent }]}>
        {!!turn.imageUri && <Image source={{ uri: turn.imageUri }} style={styles.userImg} resizeMode="cover" />}
        {!!turn.text && (
          <Txt size={15} color={c.onAccent}>
            {turn.text}
          </Txt>
        )}
      </View>
    )
  }

  if (turn.pending) {
    return (
      <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.pendingRow}>
          <ActivityIndicator color={c.accent} />
          <Txt size={13.5} color={c.textMuted}>
            Working it out…
          </Txt>
        </View>
      </View>
    )
  }

  if (turn.error) {
    return (
      <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.danger }]}>
        <Txt size={14} color={c.danger}>
          {turn.text}
        </Txt>
      </View>
    )
  }

  return (
    <View style={[styles.asstCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <SolutionView content={turn.text} onChip={onChip} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  wordmark: { fontSize: 20, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gearBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
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
  camBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontSize: 15.5, fontFamily: 'Inter_400Regular', maxHeight: 120, paddingVertical: 8, paddingTop: 9 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  disc: { textAlign: 'center', marginTop: 7 },
})
