import { createChatStore } from '@intyoza/shared/chat/chatStore'
import { chatStorage } from '../privacy/consent'

// Kept on this browser only if the person allowed "Remember my chats",
// otherwise only for this tab.
export const chatStore = createChatStore(chatStorage)
