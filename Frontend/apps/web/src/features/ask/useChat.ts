import { useEffect } from 'react'
import { useChat as useSharedChat } from '@intyoza/shared/chat/useChat'
import { useLanguage } from '../../i18n/context'
import { onProfileShared } from '../../lib/account'
import { api } from '../../lib/api'
import { chatStore } from '../../lib/chat/chatStore'
import { preferenceStorage } from '../../lib/privacy/consent'

/** Ask Intyoza chats for the web, answered by the trained model and kept in this browser according to the privacy choice. */
export function useChat() {
  const { lang } = useLanguage()
  const chat = useSharedChat({ chats: chatStore, preferences: preferenceStorage, lang, api })
  const { setProfile } = chat

  // Age, sex and province given when choosing to stay anonymous.
  useEffect(() => onProfileShared((details) => setProfile((p) => ({ ...p, ...details }))), [setProfile])

  return chat
}
