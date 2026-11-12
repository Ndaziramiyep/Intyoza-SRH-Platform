import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { COMMUNITIES } from '@intyoza/shared/community/data'
import type { Community } from '@intyoza/shared/community/types'
import { useLiveCommunity } from '@intyoza/shared/community/useLiveCommunity'
import { Icon } from '../../components/Icon'
import { Spot } from '../../components/Illustrations'
import { useLanguage } from '../../i18n/context'
import { api as client } from '../../lib/api'
import { communityStore } from '../../lib/community/store'
import { useAccount } from '../account/context'
import { CommunityImage } from './CommunityImage'
import { RulesList } from './RulesCard'

const PROMISES = [
  { icon: 'eyeOff', title: 'community.promise1Title' },
  { icon: 'shield', title: 'community.promise2Title' },
  { icon: 'lock', title: 'community.promise3Title' },
] as const

const cardClass =
  'community-card lift flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-line bg-surface text-left text-fg no-underline'

function CardBody({ community, badge }: { community: Community; badge?: ReactNode }) {
  return (
    <>
      <span className="relative block aspect-[16/10] w-full overflow-hidden">
        <CommunityImage community={community} />
        {badge}
      </span>
      <span className="flex flex-1 items-start justify-between gap-2 p-4">
        <strong className="font-display text-[1.05rem] leading-snug">{community.name}</strong>
        <Icon name="arrowRight" size={18} className="mt-0.5 shrink-0 text-brand" />
      </span>
    </>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <ul className="stagger grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">{children}</ul>
}

/** Asked when a guest opens a group: groups are for members only. */
function JoinPrompt({ community, onClose }: { community: Community; onClose: () => void }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="join-prompt-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto w-[min(calc(100%-32px),460px)] animate-[pop_450ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-[28px] border border-line bg-surface p-0 text-fg backdrop:bg-scrim backdrop:backdrop-blur-sm"
    >
      <div className="relative aspect-[16/7] overflow-hidden">
        <CommunityImage community={community} />
        <button
          type="button"
          className="icon-btn absolute top-3 right-3 size-10 bg-surface/90"
          onClick={() => ref.current?.close()}
          aria-label={t('common.close')}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="stagger p-7 text-center max-sm:px-5">
        <span className="mx-auto -mt-14 mb-3 grid size-14 place-items-center rounded-[18px] border-4 border-surface bg-brand text-on-brand">
          <Icon name="lock" size={22} />
        </span>
        <h2 id="join-prompt-title" className="m-0 font-display text-[1.4rem] leading-tight">
          {community.name}
        </h2>
        <p className="mx-auto mt-2 mb-6 max-w-[38ch] text-muted">{t('gate.joinText')}</p>
        {/* Back to the groups list: these preview groups have other ids than the ones members open. */}
        <Link to={`/login?next=${encodeURIComponent('/community')}`} className="btn btn-primary w-full">
          <Icon name="user" size={17} /> {t('account.loginOrRegister')}
        </Link>
      </div>
    </dialog>
  )
}

/** Guests see the groups (the app's own list: the backend only lists them for members) and are asked to log in to open one. */
function GuestGroups() {
  const { t } = useLanguage()
  const [chosen, setChosen] = useState<Community | null>(null)

  return (
    <>
      <p className="notice mb-5 bg-brand-soft text-fg">
        <Icon name="lock" size={18} className="text-brand" />
        <span>{t('gate.browseNote')}</span>
      </p>
      <Grid>
        {COMMUNITIES.map((c) => (
          <li key={c.id}>
            <button type="button" className={cardClass} onClick={() => setChosen(c)} aria-haspopup="dialog">
              <CardBody community={c} />
            </button>
          </li>
        ))}
      </Grid>
      {chosen && <JoinPrompt community={chosen} onClose={() => setChosen(null)} />}
    </>
  )
}

/** Members see the groups from the backend and open them. */
function MemberGroups() {
  const { t, lang } = useLanguage()
  const api = useLiveCommunity(client, communityStore, lang)

  return (
    <>
      {api.myName && api.member.joined.length > 0 && (
        <p className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-[0.92rem] text-muted">{t('community.yourName')}:</span>
          <strong>{api.myName}</strong>
        </p>
      )}

      {api.status === 'loading' && <p className="text-muted" aria-live="polite">{t('community.loading')}</p>}
      {api.status === 'error' && (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="m-0">{t('community.loadError')}</p>
          <button type="button" className="btn btn-sm btn-ghost" onClick={api.retry}>
            <Icon name="refresh" size={16} /> {t('learn.tryAgain')}
          </button>
        </div>
      )}
      {api.status === 'ready' && api.communities.length === 0 && <p className="text-muted">{t('community.empty')}</p>}

      <Grid>
        {api.communities.map((c) => (
          <li key={c.id}>
            <Link to={`/community/${c.id}`} className={cardClass}>
              <CardBody
                community={c}
                badge={
                  api.member.joined.includes(c.id) && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[0.78rem] font-semibold text-on-brand">
                      <Icon name="check" size={13} /> {t('community.joined')}
                    </span>
                  )
                }
              />
            </Link>
          </li>
        ))}
      </Grid>
    </>
  )
}

export function CommunityPage() {
  const { t } = useLanguage()
  const { account } = useAccount()

  return (
    <div className="container">
      <header className="page-head flex items-center justify-between gap-6">
        <h1 className="m-0">{t('feature.community.title')}</h1>
        <Spot name="community" className="size-20 shrink-0 max-sm:size-14" />
      </header>

      <ul className="mb-5 flex flex-wrap gap-x-5 gap-y-2">
        {PROMISES.map((p) => (
          <li key={p.title} className="flex items-center gap-2 font-semibold text-brand">
            <Icon name={p.icon} size={18} className="shrink-0" />
            {t(p.title)}
          </li>
        ))}
      </ul>

      {account?.mode === 'account' ? <MemberGroups /> : <GuestGroups />}

      <div className="mt-8">
        <RulesList />
      </div>
    </div>
  )
}
