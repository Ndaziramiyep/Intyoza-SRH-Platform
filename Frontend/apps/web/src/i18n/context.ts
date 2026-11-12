import { createContext, useContext } from 'react'
import type { Lang, TKey } from '@intyoza/shared/i18n/translations'

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TKey) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

/** Pick the right translation from a content object like `{ en, rw?, fr? }`. */
export function pick<T>(value: { en: T } & Partial<Record<Lang, T>>, lang: Lang): T {
  return value[lang] ?? value.en
}
