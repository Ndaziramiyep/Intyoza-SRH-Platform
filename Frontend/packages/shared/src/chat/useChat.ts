import { useCallback, useEffect, useRef, useState } from 'react'
import type { IntyozaApi } from '../api/client'
import type { Lang } from '../i18n/translations'
import type { KeyValueStore } from '../storage'
import type { ChatStore, ChatThread } from './chatStore'
import { askIntyoza, sessionDetails } from './client'
import type { AboutYou, ChatMessage, UserProfile } from './types'

const PROFILE_KEY = 'intyoza.profile'
const MIN_TYPING_MS = 600
const TITLE_LENGTH = 48

const DEFAULT_PROFILE: UserProfile = { ageBand: 'UNKNOWN', context: [] }

let counter = 0
const newId = () => `${Date.now()}-${counter++}`

function titleFrom(text: string) {
  return text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : text
}

type Options = {
  /** Where chat history is kept. */
  chats: ChatStore
  /** Where the age range and health context are kept. */
  preferences: KeyValueStore
  lang: Lang
  /** The backend, for answers from the trained model. Without it the offline guide answers. */
  api?: IntyozaApi
}

/** Ask Intyoza conversations: history, the active chat and sending messages. */
export function useChat({ chats, preferences, lang, api }: Options) {
  const [threads, setThreads] = useState<ChatThread[]>(chats.loadThreads)
  const [activeId, setActiveId] = useState<string | null>(() => threads[0]?.id ?? null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile>(
    () => preferences.get<UserProfile>(PROFILE_KEY) ?? DEFAULT_PROFILE,
  )

  // Latest threads for the async send() without re-creating it on every message.
  const threadsRef = useRef(threads)
  useEffect(() => {
    threadsRef.current = threads
    chats.saveThreads(threads)
  }, [chats, threads])

  useEffect(() => {
    preferences.set(PROFILE_KEY, profile)
  }, [preferences, profile])

  const active = threads.find((t) => t.id === activeId)

  const addMessage = (id: string, message: ChatMessage) =>
    setThreads((ts) => {
      const now = new Date().toISOString()
      const updated = ts.map((t) => (t.id === id ? { ...t, updatedAt: now, messages: [...t.messages, message] } : t))
      return updated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    })

  const send = useCallback(
    async (text: string, options: { fresh?: boolean; suggestion?: boolean } = {}) => {
      const message = text.trim()
      if (!message) return

      let id = options.fresh ? null : activeId
      if (!id || !threadsRef.current.some((t) => t.id === id)) {
        id = newId()
        const now = new Date().toISOString()
        const thread: ChatThread = { id, title: titleFrom(message), createdAt: now, updatedAt: now, messages: [] }
        setThreads((ts) => [thread, ...ts])
        setActiveId(id)
      }
      const thread = threadsRef.current.find((t) => t.id === id)
      const history = thread?.messages ?? []

      addMessage(id, { id: newId(), role: 'user', text: message })
      setPendingId(id)
      try {
        const [{ sessionId, ...reply }] = await Promise.all([
          askIntyoza(
            { message, history, profile, lang, sessionId: thread?.sessionId, suggestion: options.suggestion },
            api,
          ),
          new Promise((r) => setTimeout(r, MIN_TYPING_MS)),
        ])
        addMessage(id, { id: newId(), role: 'assistant', ...reply })
        if (sessionId) setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, sessionId } : t)))
      } finally {
        setPendingId(null)
      }
    },
    [activeId, profile, lang, api],
  )

  /** Keeps the details on this device and, when logged in, saves them to the account too. */
  const saveAbout = useCallback(
    async (about: AboutYou) => {
      const next: UserProfile = { ...profile, ...about, aboutAnswered: true }
      setProfile(next)
      if (!api?.hasSession()) return
      const { ageBand, gender, district } = sessionDetails(next, lang)
      await api.updateProfile({ ageBand, gender, ...(district ? { district } : {}) }).catch(() => undefined)
    },
    [profile, api, lang],
  )

  const skipAbout = useCallback(() => setProfile((p) => ({ ...p, aboutAnswered: true })), [])

  return {
    threads,
    active,
    messages: active?.messages ?? [],
    pending: pendingId !== null && pendingId === (active?.id ?? null),
    busy: pendingId !== null,
    send,
    /** Opens an empty chat; it is saved once the first message is sent. */
    newChat: useCallback(() => setActiveId(null), []),
    selectChat: setActiveId,
    clearAll: useCallback(() => {
      setThreads([])
      setActiveId(null)
    }, []),
    profile,
    setProfile,
    saveAbout,
    skipAbout,
  }
}
