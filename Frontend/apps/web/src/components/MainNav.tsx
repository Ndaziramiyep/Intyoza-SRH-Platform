import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAccount } from '../features/account/context'
import { useLanguage } from '../i18n/context'
import { useGlidePill } from '../lib/useGlidePill'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { Icon, type IconName } from './Icon'
import { Spot, type SpotName } from './Illustrations'

const FEATURES: { to: string; spot: SpotName; icon: IconName; title: TKey; text: TKey; tab: TKey }[] = [
  { to: '/services', spot: 'services', icon: 'pin', title: 'feature.services.title', text: 'home.ctaServices', tab: 'nav.services' },
  { to: '/community', spot: 'community', icon: 'users', title: 'feature.community.title', text: 'home.ctaCommunity', tab: 'nav.community' },
  { to: '/learn', spot: 'learn', icon: 'book', title: 'feature.learn.title', text: 'home.ctaLearn', tab: 'nav.learn' },
  { to: '/myths', spot: 'myths', icon: 'help', title: 'feature.myths.title', text: 'home.ctaMyths', tab: 'nav.myths' },
]

// A pointer can cross the small gap between the button and the menu without it closing.
const CLOSE_DELAY_MS = 180

const currentFeature = (pathname: string) => FEATURES.find((f) => pathname === f.to || pathname.startsWith(`${f.to}/`))?.to ?? null

/** The picture menu under Explore. A soft pill glides between the items. */
function ExploreMenu({ current, onChoose }: { current: string | null; onChoose: () => void }) {
  const { t } = useLanguage()
  const [hovered, setHovered] = useState<string | null>(null)
  const target = hovered ?? current
  const { setArea, pill, register } = useGlidePill(target)

  return (
    <ul ref={setArea} onMouseLeave={() => setHovered(null)} className="explore-panel relative grid w-[520px] grid-cols-2 gap-1 rounded-[22px] border border-line bg-surface p-2">
      {pill && <li aria-hidden="true" className="nav-pill absolute rounded-[14px] bg-brand-soft" style={{ ...pill, opacity: target ? 1 : 0 }} />}
      {FEATURES.map((f) => (
        <li key={f.to} ref={register(f.to)} className="relative z-1">
          <Link
            to={f.to}
            onClick={onChoose}
            onMouseEnter={() => setHovered(f.to)}
            onFocus={() => setHovered(f.to)}
            aria-current={current === f.to ? 'page' : undefined}
            className="explore-item flex items-center gap-3 rounded-[14px] p-3 text-fg no-underline"
          >
            <Spot name={f.spot} className="size-12 shrink-0" />
            <span className="min-w-0">
              <strong className="block leading-snug font-semibold">{t(f.title)}</strong>
              <span className="block text-[0.85rem] text-muted">{t(f.text)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Main links on wider screens: Home and Explore. Phones use BottomTabs instead. */
export function MainNav() {
  const { t } = useLanguage()
  const { account } = useAccount()
  const loggedIn = account?.mode === 'account'
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const openedByHover = useRef(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const feature = currentFeature(pathname)
  const current = pathname === '/' ? 'home' : pathname.startsWith('/dashboard') ? 'dashboard' : feature ? 'explore' : null
  const target = hovered ?? (open ? 'explore' : current)
  const { areaRef, setArea, pill, register } = useGlidePill(target)

  const close = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!areaRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, areaRef])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  return (
    <nav ref={setArea} aria-label="Main" onMouseLeave={() => setHovered(null)} className="relative flex gap-1 max-[700px]:hidden">
      {pill && <span aria-hidden="true" className="nav-pill absolute rounded-full bg-brand" style={{ ...pill, opacity: target ? 1 : 0 }} />}

      <NavLink
        to="/"
        end
        ref={register('home')}
        onMouseEnter={() => setHovered('home')}
        onFocus={() => setHovered('home')}
        onBlur={() => setHovered(null)}
        className={`nav-link relative z-1 rounded-full px-3 py-[7px] text-[0.92rem] font-medium whitespace-nowrap no-underline ${target === 'home' ? 'text-on-brand' : current === 'home' ? 'text-brand' : 'text-fg'}`}
      >
        {t('nav.home')}
      </NavLink>

      {/* Logged in: the dashboard is one click away from every page. */}
      {loggedIn && (
        <NavLink
          to="/dashboard"
          ref={register('dashboard')}
          onMouseEnter={() => setHovered('dashboard')}
          onFocus={() => setHovered('dashboard')}
          onBlur={() => setHovered(null)}
          className={`nav-link relative z-1 rounded-full px-3 py-[7px] text-[0.92rem] font-medium whitespace-nowrap no-underline ${target === 'dashboard' ? 'text-on-brand' : current === 'dashboard' ? 'text-brand' : 'text-fg'}`}
        >
          {t('nav.dashboard')}
        </NavLink>
      )}

      <div
        onMouseEnter={() => {
          window.clearTimeout(closeTimer.current)
          if (!open) openedByHover.current = true
          setOpen(true)
        }}
        onMouseLeave={() => {
          closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
        }}
      >
        <button
          type="button"
          ref={(el) => {
            buttonRef.current = el
            register('explore')(el)
          }}
          aria-expanded={open}
          aria-controls="explore-menu"
          onMouseEnter={() => setHovered('explore')}
          onFocus={() => setHovered('explore')}
          onBlur={() => setHovered(null)}
          onClick={() => {
            // A click after the pointer already opened it keeps it open; the next one closes it.
            if (open && !openedByHover.current) setOpen(false)
            else setOpen(true)
            openedByHover.current = false
          }}
          className={`nav-link relative z-1 inline-flex items-center gap-1 rounded-full py-[7px] pr-2 pl-3 text-[0.92rem] font-medium whitespace-nowrap ${target === 'explore' ? 'text-on-brand' : current === 'explore' ? 'text-brand' : 'text-fg'}`}
        >
          {t('explore.title')}
          <Icon name="chevronRight" size={14} className={`explore-chevron ${open ? '-rotate-90' : 'rotate-90'}`} />
        </button>

        {open && (
          <div id="explore-menu" className="absolute top-full left-0 z-60 pt-2">
            <ExploreMenu current={feature} onChoose={close} />
          </div>
        )}
      </div>
    </nav>
  )
}

/** Bottom bar on phones, within thumb's reach, with every part of the app always one tap away. */
export function BottomTabs() {
  const { t } = useLanguage()
  const { account } = useAccount()
  const loggedIn = account?.mode === 'account'
  const { pathname } = useLocation()
  const current = pathname === '/' ? 'home' : pathname.startsWith('/dashboard') ? 'dashboard' : currentFeature(pathname)
  const { setArea, pill, register } = useGlidePill(current)
  const tabs: { to: string; key: string; icon: IconName; label: TKey }[] = [
    loggedIn ? { to: '/dashboard', key: 'dashboard', icon: 'user', label: 'nav.dashboard' } : { to: '/', key: 'home', icon: 'home', label: 'nav.home' },
    ...FEATURES.map((f) => ({ to: f.to, key: f.to, icon: f.icon, label: f.tab })),
  ]

  return (
    <nav
      ref={setArea}
      aria-label="Main"
      className="bottom-tabs fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-bg px-1 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] min-[701px]:hidden"
    >
      {pill && <span aria-hidden="true" className="nav-pill absolute rounded-2xl bg-brand-soft" style={{ ...pill, opacity: current ? 1 : 0 }} />}
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          end={tab.to === '/'}
          ref={register(tab.key)}
          className={({ isActive }) =>
            `relative z-1 flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1 text-center text-[0.7rem] leading-[1.15] no-underline ${isActive ? 'font-semibold text-brand' : 'font-medium text-muted'}`
          }
        >
          <Icon name={tab.icon} size={20} className="shrink-0" />
          {t(tab.label)}
        </NavLink>
      ))}
    </nav>
  )
}
