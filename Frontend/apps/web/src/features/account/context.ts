import { createContext, useContext } from 'react'
import type { ApiLanguage, ApiUser, ProfileUpdate } from '@intyoza/shared/api/client'
import type { AgeBand, Gender } from '@intyoza/shared/chat/types'
import type { AccountState } from '../../lib/account'

/** The fields of POST /auth/register: email and password required, the rest optional. */
export type RegisterInput = {
  email: string
  password: string
  ageBand?: AgeBand
  gender?: Gender
  district?: string
  language?: ApiLanguage
}

type AccountContextValue = {
  /** null for a guest (anonymous, not logged in). */
  account: AccountState | null
  /** The full profile from the server once logged in (null while loading or as a guest). */
  user: ApiUser | null
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  /** Keeps the token from Google sign-in and loads the account. */
  completeGoogleLogin: (token: string) => Promise<void>
  updateProfile: (input: ProfileUpdate) => Promise<void>
  /** Forgets the account on this browser; the person continues as a guest. */
  logout: () => void
}

export const AccountContext = createContext<AccountContextValue | null>(null)

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>')
  return ctx
}
