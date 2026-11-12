import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { useAccount } from './context'

/** Shows `children` to logged-in people; everyone else is invited to log in or create an account. */
export function RequireAccount({ children, title, text }: { children: ReactNode; title: TKey; text: TKey }) {
  const { t } = useLanguage()
  const { account } = useAccount()
  const { pathname } = useLocation()

  if (account?.mode === 'account') return children

  const next = encodeURIComponent(pathname)
  return (
    <section className="container grid place-items-center py-16 max-sm:py-10">
      <div className="card stagger w-full max-w-[520px] p-9 text-center max-sm:px-5">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-[20px] bg-brand-soft text-brand">
          <Icon name="users" size={28} />
        </span>
        <h1 className="m-0 font-display text-[clamp(1.4rem,3.6vw,1.8rem)]">{t(title)}</h1>
        <p className="mx-auto mt-2 mb-6 max-w-[42ch] text-muted">{t(text)}</p>
        <Link to={`/login?next=${next}`} className="btn btn-primary">
          <Icon name="user" size={16} /> {t('account.loginOrRegister')}
        </Link>
      </div>
    </section>
  )
}
