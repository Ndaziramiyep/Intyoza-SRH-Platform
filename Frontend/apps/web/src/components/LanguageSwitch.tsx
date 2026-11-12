import { useLanguage } from '../i18n/context'
import { LANGS } from '@intyoza/shared/i18n/translations'

/** RW / EN / FR segmented switch. */
export function LanguageSwitch() {
  const { t, lang, setLang } = useLanguage()

  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-[3px]" role="group" aria-label={t('nav.language')}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          aria-pressed={lang === l.code}
          aria-label={l.label}
          onClick={() => setLang(l.code)}
          className="h-[30px] min-w-9 rounded-full px-2 text-[0.8rem] font-semibold text-fg aria-pressed:bg-brand aria-pressed:text-on-brand"
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
