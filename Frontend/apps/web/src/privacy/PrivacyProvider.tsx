import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearAllData, ensureAnonymousId, loadConsent, saveConsent, type Consent } from '../lib/privacy/consent'
import { CookieBanner } from './CookieBanner'
import { PrivacyContext } from './context'
import { PrivacyDialog } from './PrivacyDialog'

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(loadConsent)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(ensureAnonymousId, [])

  const saveChoice = useCallback((next: Consent) => {
    saveConsent(next)
    setConsent(next)
    setSettingsOpen(false)
  }, [])

  const clearAll = useCallback(() => {
    clearAllData()
    // Start fresh so nothing still held in memory is shown again.
    window.location.assign('/')
  }, [])

  const value = useMemo(
    () => ({ consent, saveChoice, openSettings: () => setSettingsOpen(true), clearAll }),
    [consent, saveChoice, clearAll],
  )

  return (
    <PrivacyContext.Provider value={value}>
      {children}
      {consent === null && !settingsOpen && <CookieBanner />}
      {settingsOpen && <PrivacyDialog onClose={() => setSettingsOpen(false)} />}
    </PrivacyContext.Provider>
  )
}
