import { createContext, useContext } from 'react'
import type { Consent } from '../lib/privacy/consent'

type PrivacyContextValue = {
  /** null until the person answers the cookie banner. */
  consent: Consent | null
  saveChoice: (consent: Consent) => void
  openSettings: () => void
  clearAll: () => void
}

export const PrivacyContext = createContext<PrivacyContextValue | null>(null)

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used inside <PrivacyProvider>')
  return ctx
}
