import type { UserProfile } from '@intyoza/shared/chat/types'
import { chatStorage, preferenceStorage } from './privacy/consent'

// How the person chose to use Intyoza: anonymously, or logged in with an account.
// Kept with the session token, so it follows the same "Remember my chats" choice.

export type AccountUser = { id: string; email?: string | null; alias?: string | null }

/** What to call someone: their nickname, or the part of their email before the @. */
export const displayName = (user: { alias?: string | null; email?: string | null }) =>
  user.alias || (user.email ? user.email.split('@')[0] : '')

export type AccountState = { mode: 'anonymous' } | { mode: 'account'; user: AccountUser }

const ACCOUNT_KEY = 'intyoza.account'
const PROFILE_KEY = 'intyoza.profile'
const PROFILE_EVENT = 'intyoza:profile'

/** null until the person has chosen. */
export const loadAccount = () => chatStorage.get<AccountState>(ACCOUNT_KEY)

export function saveAccount(state: AccountState | null) {
  if (state) chatStorage.set(ACCOUNT_KEY, state)
  else chatStorage.remove(ACCOUNT_KEY)
}

/**
 * Adds details (age, sex, province…) to the chat profile: saved for the next visit and passed
 * to the open chat, which keeps its own copy.
 */
export function shareProfile(details: Partial<UserProfile>) {
  const current = preferenceStorage.get<UserProfile>(PROFILE_KEY) ?? { ageBand: 'UNKNOWN', context: [] }
  preferenceStorage.set(PROFILE_KEY, { ...current, ...details })
  window.dispatchEvent(new CustomEvent<Partial<UserProfile>>(PROFILE_EVENT, { detail: details }))
}

/** Calls `listener` with details shared from outside the chat. Returns the unsubscribe function. */
export function onProfileShared(listener: (details: Partial<UserProfile>) => void) {
  const handle = (e: Event) => listener((e as CustomEvent<Partial<UserProfile>>).detail)
  window.addEventListener(PROFILE_EVENT, handle)
  return () => window.removeEventListener(PROFILE_EVENT, handle)
}
