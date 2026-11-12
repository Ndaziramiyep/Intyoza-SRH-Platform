import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { displayName } from '../../lib/account'
import { useAccount } from './context'

const headerBtn = 'btn btn-sm border-line bg-transparent text-fg hover:border-brand hover:text-brand max-sm:px-2.5'
const menuItem = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-fg no-underline hover:bg-brand-soft hover:text-brand'

/** Header button: "Log in" for guests; once logged in, the account with a small menu. */
export function AccountButton() {
  const { t } = useLanguage()
  const { account, logout } = useAccount()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (account?.mode !== 'account') {
    return (
      <Link to="/login" className="btn btn-sm btn-primary max-sm:px-2.5" aria-label={t('account.loginOrRegister')}>
        <Icon name="user" size={16} /> <span className="max-[820px]:hidden">{t('account.loginOrRegister')}</span>
      </Link>
    )
  }

  const name = displayName(account.user)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={`${headerBtn} gap-2`}
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`${t('account.signedInAs')} ${name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="grid size-6 place-items-center rounded-full bg-brand text-[0.75rem] font-bold text-on-brand uppercase">
          {name.charAt(0) || '?'}
        </span>
        <span className="max-w-[14ch] truncate max-[820px]:hidden">{name}</span>
      </button>
      {open && (
        <div
          id="account-menu"
          className="absolute top-[calc(100%+10px)] right-0 z-50 w-72 origin-top-right animate-[pop_300ms_cubic-bezier(0.22,1,0.36,1)] rounded-3xl border border-line bg-surface p-2 shadow-[0_24px_50px_-24px_color-mix(in_srgb,var(--ink)_45%,transparent)]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="m-0 text-[0.8rem] text-muted">{t('account.signedInAs')}</p>
            <p className="m-0 truncate font-semibold">{name}</p>
          </div>
          <div className="border-t border-line pt-2">
            <Link to="/dashboard" className={menuItem} onClick={() => setOpen(false)}>
              <Icon name="home" size={17} /> {t('account.myDashboard')}
            </Link>
            <Link to="/dashboard?tab=profile" className={menuItem} onClick={() => setOpen(false)}>
              <Icon name="user" size={17} /> {t('account.profileTitle')}
            </Link>
            <Link to="/dashboard?tab=help" className={menuItem} onClick={() => setOpen(false)}>
              <Icon name="phone" size={17} /> {t('pro.title')}
            </Link>
            <button
              type="button"
              className={`${menuItem} text-[#c0392b] hover:bg-[color-mix(in_srgb,#c0392b_10%,var(--base))] hover:text-[#c0392b]`}
              onClick={() => {
                setOpen(false)
                logout()
              }}
            >
              <Icon name="arrowLeft" size={17} /> {t('account.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
