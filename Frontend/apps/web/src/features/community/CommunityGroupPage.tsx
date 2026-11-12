import { Link, Navigate, useParams } from 'react-router-dom'
import { COMMUNITIES } from '@intyoza/shared/community/data'
import { Icon } from '../../components/Icon'
import { quickExit } from '../../lib/privacy/consent'
import { useLanguage } from '../../i18n/context'
import { GroupChat } from './GroupChat'
import { CommunityImage, CommunityImageCredit } from './CommunityImage'
import { JoinCommunity } from './JoinCommunity'
import { useLiveCommunity } from '@intyoza/shared/community/useLiveCommunity'
import { api as client } from '../../lib/api'
import { communityStore } from '../../lib/community/store'

export function CommunityGroupPage() {
  const { id } = useParams()
  const { t, lang } = useLanguage()
  const api = useLiveCommunity(client, communityStore, lang, id)
  const community = api.communities.find((c) => c.id === id)

  const back = (
    <Link to="/community" className="btn btn-ghost btn-sm back-link">
      <Icon name="arrowLeft" size={16} /> {t('community.allGroups')}
    </Link>
  )

  if (api.status !== 'ready') {
    return (
      <div className="container page-head">
        {back}
        {api.status === 'loading' ? (
          <p className="text-muted" aria-live="polite">{t('community.loading')}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3" role="alert">
            <p className="m-0">{t('community.loadError')}</p>
            <button type="button" className="btn btn-sm btn-ghost" onClick={api.retry}>
              <Icon name="refresh" size={16} /> {t('learn.tryAgain')}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!community) {
    // An older link to one of the app's preview groups: show the real groups instead.
    if (COMMUNITIES.some((c) => c.id === id)) return <Navigate to="/community" replace />
    return (
      <div className="container page-head">
        {back}
        <h1>{t('community.notFound')}</h1>
      </div>
    )
  }

  const joined = api.member.joined.includes(community.id)

  return (
    <div className={joined ? 'container pt-3' : 'container'}>
      {!joined && community.sensitive && (
        <button
          type="button"
          onClick={quickExit}
          className="fixed bottom-4 left-4 z-60 max-[700px]:bottom-[76px] inline-flex items-center gap-1.5 rounded-full bg-brand px-[18px] py-3 font-extrabold text-on-brand"
        >
          <Icon name="close" size={16} /> {t('community.quickExit')}
        </button>
      )}

      {!joined && (
      <header className="pt-6 pb-5">
        {back}
        <div className="flex items-center gap-5 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
          <div className="w-[280px] shrink-0 max-sm:w-full">
            <div className="community-hero aspect-[16/10] w-full overflow-hidden rounded-[18px] max-sm:aspect-auto max-sm:h-36">
              <CommunityImage community={community} />
            </div>
            <CommunityImageCredit community={community} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mb-1 text-[clamp(1.6rem,4vw,2.4rem)]">{community.name}</h1>
            <p className="m-0 text-muted">{community.tagline}</p>
          <div className="chip-row mt-3">
          {community.moderators && (
            <span className="tag inline-flex items-center gap-1.5">
              <Icon name="shield" size={13} /> {community.moderators}
            </span>
          )}
          {community.preModerated && (
            <span className="tag tag-brand inline-flex items-center gap-1.5">
              <Icon name="eyeOff" size={13} /> {t('community.everyPostReviewed')}
            </span>
          )}
          {community.sensitive && <span className="tag">{t('community.extraPrivacy')}</span>}
        </div>
          </div>
        </div>
      </header>
      )}

      <div className="grid grid-cols-[1fr_300px] items-start gap-5 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-3.5">
          {joined ? (
            <>
              <GroupChat key={community.id} community={community} api={api} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CommunityImageCredit community={community} />
                <button type="button" className="btn btn-sm btn-ghost ml-auto" onClick={() => api.leave(community.id)}>
                  {t('community.leave')}
                </button>
              </div>
            </>
          ) : (
            <JoinCommunity community={community} api={api} />
          )}
        </div>

        <aside className="sticky top-[84px] flex flex-col gap-3.5 max-[900px]:static">
          <section className="card">
            <h3>{t('community.needMore')}</h3>
            <div className="flex flex-col gap-2">
              <Link to="/ask" className="btn btn-sm btn-ghost">
                <Icon name="chat" size={16} /> {t('nav.ask')}
              </Link>
              <Link to="/services?need=counseling" className="btn btn-sm btn-ghost">
                <Icon name="pin" size={16} /> {t('community.findCounsellor')}
              </Link>
            </div>
          </section>
          <section className="card">
            <h3>{t('community.emergency')}</h3>
            <p className="text-[0.85rem]">
              <a href="tel:112">112</a> {t('hotline.policeShort')} · <a href="tel:3512">3512</a> {t('hotline.isangeShort')} ·{' '}
              <a href="tel:116">116</a> {t('hotline.child')} · <a href="tel:912">912</a> {t('hotline.ambulance')}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
