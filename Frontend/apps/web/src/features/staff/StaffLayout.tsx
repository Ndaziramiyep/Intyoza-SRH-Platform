import { useMemo, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { translate, type TKey } from '@intyoza/shared/i18n/translations'
import { Brand } from '../../components/Brand'
import { Icon } from '../../components/Icon'
import { LanguageContext, useLanguage } from '../../i18n/context'
import { LEARN_SOURCE } from '../../lib/learn/courseClient'
import { quickExit } from '../../lib/privacy/consent'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { useAccount } from '../account/context'
import { RequireRole } from './RequireRole'
import { pagesFor, staffRoleOf } from './roles'

// The Learning Hub staff area (/admin): admins, health reviewers and translators. Built for laptops
// first and usable on a tablet: a side navigation that becomes a scrolling tab bar on narrow screens.
// Quick exit stays in the header, as on every Intyoza screen.

export function StaffLayout() {
  const { setLang } = useLanguage()
  // Staff screens are written in English only for now, so the whole area shows English (labels it
  // shares with the learner screens included) instead of a mix. Lesson content keeps its own languages.
  const english = useMemo(() => ({ lang: 'en' as const, setLang, t: (key: TKey) => translate('en', key) }), [setLang])

  return (
    <LanguageContext.Provider value={english}>
      <div className="flex min-h-dvh flex-col bg-bg" lang="en">
        <StaffHeader />
        <RequireRole roles={['admin', 'health_reviewer', 'translator']}>
          <StaffBody />
        </RequireRole>
      </div>
    </LanguageContext.Provider>
  )
}

function StaffHeader() {
  const { t } = useLanguage()
  const { user } = useAccount()
  const role = staffRoleOf(user)

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-6 max-sm:gap-2 max-sm:px-4">
        <Brand />
        <span className="h-7 w-px bg-line max-sm:hidden" aria-hidden="true" />
        <span className="font-display text-[1.02rem] font-bold max-sm:hidden">{t('staff.title')}</span>
        <div className="ml-auto flex items-center gap-2.5 max-sm:gap-1.5">
          {role && <span className="tag tag-brand max-[700px]:hidden">{t(`staff.role.${role}`)}</span>}
          <ThemeToggle />
          <Link to="/" className="btn btn-sm btn-ghost max-[700px]:hidden">
            {t('staff.backToSite')}
          </Link>
          <button
            type="button"
            className="btn btn-sm border-fg bg-transparent text-fg hover:bg-fg hover:text-bg max-sm:px-2.5"
            onClick={quickExit}
            aria-label={t('privacy.quickExit')}
          >
            <Icon name="close" size={16} /> <span className="max-[820px]:hidden">{t('privacy.quickExit')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function StaffBody() {
  const { t } = useLanguage()
  const { user } = useAccount()
  const role = staffRoleOf(user)
  const pages = role ? pagesFor(role) : []

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[0.93rem] font-semibold no-underline whitespace-nowrap ${
      isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg'
    }`

  return (
    <div className="grid flex-1 grid-cols-[232px_1fr] max-[900px]:grid-cols-1">
      <nav aria-label={t('staff.title')} className="border-r border-line p-4 max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:px-4 max-[900px]:py-2">
        <ul className="m-0 flex list-none flex-col gap-1 p-0 max-[900px]:flex-row max-[900px]:overflow-x-auto">
          {pages.map((page) => (
            <li key={page.path}>
              <NavLink to={`/admin/${page.path}`} className={link}>
                <Icon name={page.icon} size={18} /> {t(page.label)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main" className="min-w-0 px-8 pt-8 pb-16 max-sm:px-4 max-sm:pt-5">
        {LEARN_SOURCE === 'sample' && (
          <p className="notice notice-warn mb-6 text-[0.9rem]">
            <Icon name="info" size={18} /> {t('staff.sample')}
          </p>
        )}
        <Outlet />
      </main>
    </div>
  )
}

/** /admin: the first page the signed-in role may open. */
export function StaffHome() {
  const { user } = useAccount()
  const role = staffRoleOf(user)
  const first = role ? pagesFor(role)[0] : undefined
  return first ? <Navigate to={`/admin/${first.path}`} replace /> : null
}

/** Title and one-line purpose at the top of each staff page. */
export function StaffPageHeader({ title, intro, actions }: { title: string; intro: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="m-0 font-display text-[1.6rem]">{title}</h1>
        <p className="mt-1 mb-0 max-w-[62ch] text-muted">{intro}</p>
      </div>
      {actions}
    </header>
  )
}
