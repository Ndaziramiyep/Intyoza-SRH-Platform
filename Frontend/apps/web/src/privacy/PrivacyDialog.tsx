import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useLanguage } from '../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { ESSENTIAL_ONLY, type Consent } from '../lib/privacy/consent'
import { usePrivacy } from './context'

const OPTIONAL: { key: keyof Consent; title: TKey; text: TKey }[] = [
  { key: 'chats', title: 'privacy.chatsTitle', text: 'privacy.chatsText' },
  { key: 'preferences', title: 'privacy.prefsTitle', text: 'privacy.prefsText' },
  { key: 'stats', title: 'privacy.statsTitle', text: 'privacy.statsText' },
]

const DEFAULT_CHOICE: Consent = { chats: true, preferences: true, stats: false }

const row = 'flex items-center gap-5 px-5 py-4 [&+&]:border-t [&+&]:border-line'
const rowTitle = 'm-0 mb-0.5 text-base'
const rowText = 'm-0 text-[0.92rem] text-muted'

export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const { consent, saveChoice, clearAll } = usePrivacy()
  const [choice, setChoice] = useState<Consent>(consent ?? DEFAULT_CHOICE)
  const ref = useRef<HTMLDialogElement>(null)

  // A native modal dialog keeps focus inside and closes on Escape.
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="privacy-dialog-title"
      onClose={onClose}
      className="m-auto max-h-[calc(100svh-32px)] w-[min(calc(100%-32px),640px)] rounded-[32px] border border-line bg-surface p-8 text-fg backdrop:bg-scrim max-sm:rounded-3xl max-sm:px-[18px] max-sm:py-[22px]"
    >
      <header className="flex items-start gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-[18px] bg-brand-soft text-brand max-sm:hidden">
          <Icon name="cookie" size={28} />
        </span>
        <div>
          <h2 id="privacy-dialog-title" className="mt-1 mb-1.5 font-display text-[clamp(1.4rem,3vw,1.9rem)]">
            {t('privacy.dialogTitle')}
          </h2>
          <p className="m-0 text-muted">{t('privacy.dialogText')}</p>
        </div>
        <button type="button" className="icon-btn ml-auto size-11" onClick={onClose} aria-label={t('common.close')}>
          <Icon name="close" size={18} />
        </button>
      </header>

      <ul className="mt-6 rounded-[20px] border border-line">
        <li className={row}>
          <div className="flex-1">
            <h3 className={rowTitle}>{t('privacy.essentialTitle')}</h3>
            <p className={rowText}>{t('privacy.essentialText')}</p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-[0.85rem] font-bold whitespace-nowrap text-brand">
            {t('privacy.alwaysOn')}
          </span>
        </li>
        {OPTIONAL.map((o) => (
          <li key={o.key} className={row}>
            <div className="flex-1">
              <h3 id={`consent-${o.key}`} className={rowTitle}>
                {t(o.title)}
              </h3>
              <p className={rowText}>{t(o.text)}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={choice[o.key]}
              aria-labelledby={`consent-${o.key}`}
              onClick={() => setChoice((c) => ({ ...c, [o.key]: !c[o.key] }))}
              className="relative h-[30px] w-[52px] shrink-0 rounded-full bg-line transition-colors after:absolute after:top-[3px] after:left-[3px] after:size-6 after:rounded-full after:bg-bg after:transition-transform after:content-[''] aria-checked:bg-brand aria-checked:after:translate-x-[22px]"
            />
          </li>
        ))}
      </ul>

      <p className="notice notice-warn mt-5 mb-0 bg-surface-2 text-fg">
        <Icon name="info" size={18} />
        <span>
          {t('privacy.sharedTip1')} <strong>{t('privacy.quickExit')}</strong> {t('privacy.sharedTip2')}
        </span>
      </p>

      <footer className="mt-6 flex flex-wrap gap-2.5 max-sm:[&>.btn]:basis-full">
        <button
          type="button"
          className="btn btn-danger-outline"
          onClick={() => {
            if (window.confirm(t('privacy.clearConfirm'))) clearAll()
          }}
        >
          {t('privacy.clearAll')}
        </button>
        <span className="flex-1" />
        <button type="button" className="btn btn-outline" onClick={() => saveChoice(ESSENTIAL_ONLY)}>
          {t('privacy.essentialOnly')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => saveChoice(choice)}>
          {t('privacy.save')}
        </button>
      </footer>
    </dialog>
  )
}
