import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext } from './context'
import { translate, type Lang, type TKey } from '@intyoza/shared/i18n/translations'
import { preferenceStorage as storage } from '../lib/privacy/consent'

const STORAGE_KEY = 'intyoza.lang'

/** Kinyarwanda first: a saved choice wins, otherwise everyone starts in Kinyarwanda. */
function initialLang(): Lang {
  const saved = storage.get<Lang>(STORAGE_KEY)
  return saved === 'en' || saved === 'rw' || saved === 'fr' ? saved : 'rw'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    storage.set(STORAGE_KEY, next)
  }, [])

  const value = useMemo(
    () => ({ lang, setLang, t: (key: TKey) => translate(lang, key) }),
    [lang, setLang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
