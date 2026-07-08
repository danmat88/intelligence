import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore'
import { ai } from '../ai'
import type { ChatTurn } from '../ai/types'
import { useAuth } from '../auth/AuthProvider'

/**
 * Conversation state for the whole app — the "brain" behind the chat UI.
 *
 * Backed by Firestore under users/{uid}/conversations/{id}/messages/{id}:
 * everything is written to the user's own space (enforced by security rules),
 * synced live across devices, and served from the native offline cache when
 * there's no network. Writes are fire-and-forget — the local cache applies
 * them instantly and syncs in the background, so the UI never waits on I/O.
 *
 * Two things are kept OUT of Firestore:
 *  - the in-flight assistant reply: tokens stream into a local `draft` bubble
 *    whose id is the reply's future doc id; when the finished message is
 *    written (one write per reply) the snapshot takes over seamlessly, because
 *    the merge below hides the draft the moment its id appears in `messages`.
 *  - failed turns: errors render as an ephemeral draft bubble and are never
 *    persisted, so a network blip doesn't become a permanent part of history.
 */

export type Role = 'user' | 'assistant'

export type Message = {
  id: string
  role: Role
  text: string
  pending?: boolean
  error?: boolean
  /** true only on the live draft while tokens are still arriving. */
  streaming?: boolean
}

export type Conversation = {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

const SYSTEM =
  'You are Intelligence, a helpful, warm, and concise AI assistant. Answer clearly. ' +
  'Use short paragraphs and lists where useful.'

/** Real model selection, like ChatGPT's header picker. Whitelisted server-side. */
export type ModelChoice = 'flash' | 'pro'

export const MODELS: Record<ModelChoice, { label: string; blurb: string; id: string }> = {
  flash: { label: 'Gemini Flash', blurb: 'Fast and sharp — everyday answers', id: 'gemini-2.5-flash' },
  pro: { label: 'Gemini Pro', blurb: 'Deepest reasoning — hard problems', id: 'gemini-2.5-pro' },
}

/** currentId value for the not-yet-persisted "New chat". */
export const NEW_CHAT = 'new'
const NEW = NEW_CHAT

/** Messages are loaded newest-first in pages of this size. */
const PAGE = 80

type ConversationMeta = { id: string; title: string; updatedAt: number }

type ChatContextValue = {
  conversations: Conversation[]
  current: Conversation
  sending: boolean
  newChat: () => void
  selectChat: (id: string) => void
  deleteChat: (id: string) => void
  send: (text: string) => void
  /** Stop the in-flight reply; the partial text is kept, like ChatGPT's stop. */
  stop: () => void
  /** Re-answer the last question: the old reply is replaced by a fresh one. */
  regenerate: () => void
  /** Fetch the next (older) page of the open conversation, if any. */
  loadOlder: () => void
  model: ModelChoice
  setModel: (m: ModelChoice) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const uid = user?.id ?? null

  const [metas, setMetas] = useState<ConversationMeta[]>([])
  const [currentId, setCurrentId] = useState<string>(NEW)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLimit, setMsgLimit] = useState(PAGE)
  const [sending, setSending] = useState(false)
  // The streaming (or error) assistant bubble for `draftConv`. Its id is the
  // reply's Firestore doc id, so the merge in `value` hides it exactly when
  // the persisted message arrives — no timers, no content heuristics.
  const [draft, setDraft] = useState<Message | null>(null)
  const [model, setModel] = useState<ModelChoice>('flash')
  const draftConv = useRef<string | null>(null)
  const inFlight = useRef<AbortController | null>(null)

  const convCol = useCallback(() => {
    if (!uid) throw new Error('Chat requires a signed-in user')
    return collection(getFirestore(), 'users', uid, 'conversations')
  }, [uid])

  // NOTE: must go through the conversation DocumentReference: RNFirebase's
  // modular collection() accepts a CollectionReference parent in its types but
  // crashes at runtime (CollectionReference has no .collection method).
  const msgCol = useCallback((cid: string) => collection(doc(convCol(), cid), 'messages'), [convCol])

  // live conversation list, newest first
  useEffect(() => {
    if (!uid) return
    const q = query(convCol(), orderBy('updatedAt', 'desc'))
    return onSnapshot(
      q,
      (snap) => {
        setMetas(
          snap.docs.map((d) => {
            const data = d.data() as { title?: string; updatedAt?: number }
            return { id: d.id, title: data.title ?? 'New chat', updatedAt: data.updatedAt ?? 0 }
          }),
        )
      },
      // fires on permission-denied during the sign-out teardown window - benign
      (e) => console.warn('conversations listener:', e.message),
    )
  }, [uid, convCol])

  // live messages of the open conversation, newest `msgLimit` of them (stored
  // in chronological order). Cleared synchronously on every switch so a send
  // can never read (or show) the previous chat's thread.
  useEffect(() => {
    setMessages([])
    if (!uid || currentId === NEW) return
    const q = query(msgCol(currentId), orderBy('createdAt', 'desc'), limit(msgLimit))
    return onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs
            .map((d) => {
              const data = d.data() as { role: Role; text: string; error?: boolean }
              return { id: d.id, role: data.role, text: data.text, error: data.error }
            })
            .reverse(),
        )
      },
      (e) => console.warn('messages listener:', e.message),
    )
  }, [uid, currentId, msgLimit, msgCol])

  const loadOlder = useCallback(() => {
    // a full page means there may be more history behind it
    setMsgLimit((l) => (messages.length >= l ? l + PAGE : l))
  }, [messages.length])

  const newChat = useCallback(() => {
    setCurrentId(NEW)
    setMsgLimit(PAGE)
    setDraft(null)
    draftConv.current = null
  }, [])

  const selectChat = useCallback((id: string) => {
    setCurrentId(id)
    setMsgLimit(PAGE)
  }, [])

  const deleteChat = useCallback(
    (id: string) => {
      // deleting the open chat moves to the next one, like closing a tab
      if (id === currentId) {
        const rest = metas.filter((m) => m.id !== id)
        setCurrentId(rest[0]?.id ?? NEW)
        setMsgLimit(PAGE)
      }
      if (draftConv.current === id) {
        setDraft(null)
        draftConv.current = null
      }
      // messages are removed first so no orphans remain, then the conversation
      getDocs(msgCol(id))
        .then((snap) => Promise.all(snap.docs.map((d) => deleteDoc(d.ref))))
        .then(() => deleteDoc(doc(convCol(), id)))
        .catch(() => {})
    },
    [convCol, msgCol, currentId, metas],
  )

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || sending || !uid) return
      setSending(true)

      try {
        const now = Date.now()
        // create the conversation on first message; never block the UI on I/O -
        // the local cache applies writes instantly and syncs when it can
        let cid = currentId
        if (cid === NEW) {
          const ref = doc(convCol())
          cid = ref.id
          setDoc(ref, { title: text.slice(0, 40), createdAt: now, updatedAt: now }).catch(() => {})
          setCurrentId(cid)
        } else {
          updateDoc(doc(convCol(), cid), { updatedAt: now }).catch(() => {})
        }

        setDoc(doc(msgCol(cid)), { role: 'user', text, createdAt: now }).catch(() => {})

        // history for context = everything already in the thread + this new turn
        const turns: ChatTurn[] = [
          ...messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text })),
          { role: 'user', text },
        ]

        await streamReply(cid, turns)
      } finally {
        setSending(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convCol, msgCol, currentId, messages, sending, uid, model],
  )

  /**
   * Streams one assistant reply into `cid`: draft bubble while tokens arrive,
   * one Firestore write when done. Shared by send() and regenerate().
   */
  const streamReply = useCallback(
    async (cid: string, turns: ChatTurn[]) => {
      // the reply's doc id is decided up front: the streaming draft carries it,
      // and the merge in `value` swaps draft -> persisted message by this id
      const replyRef = doc(msgCol(cid))
      draftConv.current = cid
      setDraft({ id: replyRef.id, role: 'assistant', text: '', pending: true, streaming: true })

      const controller = new AbortController()
      inFlight.current = controller
      try {
        const res = await ai.stream(
          turns,
          (delta) => setDraft((d) => (d ? { ...d, text: d.text + delta, pending: false } : d)),
          {
            system: SYSTEM,
            model: MODELS[model].id,
            maxTokens: 2048,
            signal: controller.signal,
          },
        )
        if (res.text) {
          setDoc(replyRef, { role: 'assistant', text: res.text, createdAt: Date.now() }).catch(() => {})
          updateDoc(doc(convCol(), cid), { updatedAt: Date.now() }).catch(() => {})
        } else {
          setDraft(null) // stopped before the first token - nothing to keep
        }
      } catch (e) {
        // ephemeral: shown until the next send / chat switch, never persisted
        const msg = e instanceof Error ? e.message : String(e)
        setDraft({ id: replyRef.id, role: 'assistant', text: msg, error: true })
      } finally {
        inFlight.current = null
      }
    },
    [convCol, msgCol, model],
  )

  /** Replace the last assistant reply with a freshly generated one. */
  const regenerate = useCallback(async () => {
    if (sending || !uid || currentId === NEW) return
    const lastReply = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error)
    const turns: ChatTurn[] = messages
      .filter((m) => !m.error && m.id !== lastReply?.id)
      .map((m) => ({ role: m.role, text: m.text }))
    if (!turns.length || turns[turns.length - 1].role !== 'user') return

    setSending(true)
    try {
      if (lastReply) deleteDoc(doc(msgCol(currentId), lastReply.id)).catch(() => {})
      await streamReply(currentId, turns)
    } finally {
      setSending(false)
    }
  }, [messages, msgCol, currentId, sending, uid, streamReply])

  const stop = useCallback(() => inFlight.current?.abort(), [])

  const value = useMemo<ChatContextValue>(() => {
    const showDraft =
      draft !== null && draftConv.current === currentId && !messages.some((m) => m.id === draft.id)
    const withDraft = showDraft ? [...messages, draft] : messages

    const meta = metas.find((m) => m.id === currentId)
    const current: Conversation = {
      id: currentId,
      title: currentId === NEW ? 'New chat' : meta?.title ?? 'New chat',
      messages: withDraft,
      updatedAt: meta?.updatedAt ?? Date.now(),
    }

    const conversations: Conversation[] = metas.map((m) => ({ ...m, messages: [] }))

    return {
      conversations,
      current,
      sending,
      newChat,
      selectChat,
      deleteChat,
      send,
      stop,
      regenerate,
      loadOlder,
      model,
      setModel,
    }
  }, [metas, messages, draft, currentId, sending, newChat, selectChat, deleteChat, send, stop, regenerate, loadOlder, model])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within <ChatProvider>')
  return ctx
}
