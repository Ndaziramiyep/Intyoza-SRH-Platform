import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { TOPIC_STARTERS } from '@intyoza/shared/chat/knowledge'
import type { TopicId } from '@intyoza/shared/chat/types'
import { ChatWidgetContext, useChatWidget } from './chatWidgetContext'

export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [request, setRequest] = useState<string | null>(null)

  const openChat = useCallback(() => setOpen(true), [])
  const closeChat = useCallback(() => setOpen(false), [])
  const clearRequest = useCallback(() => setRequest(null), [])

  const askIntyoza = useCallback((text: string) => {
    setRequest(text)
    setOpen(true)
  }, [])

  const openFromLink = useCallback(
    (params: URLSearchParams) => {
      const topic = params.get('topic') as TopicId | null
      const text = params.get('q') ?? (topic && TOPIC_STARTERS[topic])
      if (text) askIntyoza(text)
      else setOpen(true)
    },
    [askIntyoza],
  )

  // Links to /ask open the chatbot where the person is, so they keep their place in a lesson or list.
  // Runs before the router's own click handling, which leaves a prevented click alone.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = (e.target as Element).closest?.('a')
      if (!link || link.origin !== window.location.origin || link.pathname !== '/ask') return
      e.preventDefault()
      openFromLink(new URLSearchParams(link.search))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [openFromLink])

  const value = useMemo(
    () => ({ open, openChat, closeChat, askIntyoza, request, clearRequest, openFromLink }),
    [open, openChat, closeChat, askIntyoza, request, clearRequest, openFromLink],
  )

  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>
}

/** A direct visit to /ask (a saved link, the installed app's shortcut): opens the chatbot over the page before it. */
export function AskRoute() {
  const { openFromLink } = useChatWidget()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    openFromLink(params)
    navigate('/', { replace: true })
  }, [openFromLink, params, navigate])

  return null
}
