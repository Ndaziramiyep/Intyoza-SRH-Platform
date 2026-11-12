import { createContext, useContext } from 'react'

export type ChatWidgetApi = {
  open: boolean
  openChat: () => void
  closeChat: () => void
  /** Opens the chatbot and asks this in a new chat. */
  askIntyoza: (text: string) => void
  /** A question waiting for the chatbot to send it. */
  request: string | null
  clearRequest: () => void
  /** Opens the chatbot from a /ask link's ?q= or ?topic=. */
  openFromLink: (params: URLSearchParams) => void
}

export const ChatWidgetContext = createContext<ChatWidgetApi | null>(null)

export function useChatWidget() {
  const value = useContext(ChatWidgetContext)
  if (!value) throw new Error('useChatWidget must be used inside ChatWidgetProvider')
  return value
}
