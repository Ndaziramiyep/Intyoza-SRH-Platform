import type { KeyValueStore } from '../storage'
import type { ChatMessage } from './types'

/** One conversation in the chat history. */
export type ChatThread = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  /** The backend chat session, once the trained model has answered in this conversation. */
  sessionId?: string
}

const CHATS_KEY = 'intyoza.chats'

export type ChatStore = ReturnType<typeof createChatStore>

/** Chat history in the given storage (each app decides whether that outlives the session). */
export function createChatStore(storage: KeyValueStore) {
  const loadThreads = (): ChatThread[] => storage.get<ChatThread[]>(CHATS_KEY) ?? []
  return {
    loadThreads,
    saveThreads(threads: ChatThread[]) {
      if (threads.length) storage.set(CHATS_KEY, threads)
      else storage.remove(CHATS_KEY)
    },
    /** Messages of the most recent conversation. */
    loadChat: (): ChatMessage[] => loadThreads()[0]?.messages ?? [],
  }
}
