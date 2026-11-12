import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AccountButton } from '../features/account/AccountButton'
import { ChatWidget } from '../features/ask/ChatWidget'
import { ChatWidgetProvider } from '../features/ask/ChatWidgetProvider'
import { useLanguage } from '../i18n/context'
import { useReveal } from '../lib/useReveal'
import { type TKey } from '@intyoza/shared/i18n/translations'
import { quickExit } from '../lib/privacy/consent'
import { TEAM } from '../lib/team'
import { usePrivacy } from '../privacy/context'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Brand } from './Brand'
import { Icon } from './Icon'
import { LanguageSwitch } from './LanguageSwitch'
import { BottomTabs, MainNav } from './MainNav'

const NAV: { to: string; key: TKey }[] = [
  { to: '/ask', key: 'nav.ask' },
  { to: '/services', key: 'nav.services' },
  { to: '/community', key: 'nav.community' },
  { to: '/learn', key: 'nav.learn' },
  { to: '/myths', key: 'nav.myths' },
]

// Free national lines in Rwanda, shown in the footer.
const HOTLINES: { number: string; key: TKey }[] = [
  { number: '112', key: 'hotline.policeShort' },
  { number: '114', key: 'hotline.health' },
  { number: '116', key: 'hotline.child' },
  { number: '3512', key: 'hotline.isangeShort' },
  { number: '912', key: 'hotline.ambulance' },
]

const footerHeading = 'mb-3 text-[0.8rem] font-bold tracking-[0.06em] text-fg uppercase'
const footerLink = 'text-muted no-underline hover:text-brand hover:underline'

export function Layout() {
  const { t } = useLanguage()
  const { openSettings } = usePrivacy()
  const location = useLocation()
  useReveal(location.pathname)

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <ChatWidgetProvider>
      <a
        href="#main"
        className="absolute top-2 -left-[9999px] z-[100] rounded-lg bg-brand px-3.5 py-2 text-on-brand focus:left-2"
      >
        {t('common.skip')}
      </a>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="container flex h-[72px] items-center gap-5 max-sm:gap-2">
          <Brand />

          <MainNav />

          <div className="ml-auto flex items-center gap-2.5 max-sm:gap-1.5">
            <LanguageSwitch />
            <ThemeToggle />
            <AccountButton />
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

      <main id="main" className="flex-1">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <footer className="mt-16 border-t border-line bg-surface pt-10 pb-8 text-[0.9rem] text-muted max-[700px]:pb-24">
        <div className="container grid grid-cols-[1.4fr_1fr_1.2fr_1fr] gap-8 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
          <div>
            <p className="m-0 font-display text-[1.4rem] font-bold text-brand">Intyoza</p>
            <p className="mt-2 mb-0 max-w-[32ch]">
              {t('footer.short')} <strong className="text-fg">912</strong>.
            </p>
          </div>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className={footerHeading}>
              {t('explore.title')}
            </h2>
            <ul className="space-y-2">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={footerLink}>
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-hotlines">
            <h2 id="footer-hotlines" className={footerHeading}>
              {t('hotline.title')}
            </h2>
            <ul className="space-y-2">
              {HOTLINES.map((h) => (
                <li key={h.number}>
                  <a href={`tel:${h.number}`} className={footerLink}>
                    <strong className="inline-block min-w-[3.2em] text-fg">{h.number}</strong> {t(h.key)}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <nav aria-labelledby="footer-about">
            <h2 id="footer-about" className={footerHeading}>
              {t('footer.links')}
            </h2>
            <ul className="space-y-2">
              <li>
                <button type="button" className={footerLink} onClick={openSettings}>
                  {t('footer.privacy')}
                </button>
              </li>
              <li>
                <Link to="/about#terms" className={footerLink}>
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/about" className={footerLink}>
                  {t('footer.about')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="container mt-9 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line pt-5 text-[0.82rem]">
          <p className="m-0">© {new Date().getFullYear()} Intyoza</p>
          <p className="m-0">
            {t('footer.madeBy')} {TEAM.map((m) => m.name).join(' · ')}
          </p>
        </div>
      </footer>

      <BottomTabs />
      <ChatWidget />
    </ChatWidgetProvider>
  )
}
