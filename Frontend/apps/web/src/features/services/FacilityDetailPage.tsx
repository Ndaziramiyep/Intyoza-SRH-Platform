import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { fetchFacility } from '@intyoza/shared/services/api'
import type { Facility, ServiceId } from '@intyoza/shared/services/types'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { costKey, directionsUrl, formatHours, hoursKnown, isOpenNow, serviceKey, typeKey } from '@intyoza/shared/services/utils'
import { openBadge, plainList, serviceList } from './styles'

// What a young person can say (or show on their phone) at reception.
// What to say at reception, in the chosen language.
const scriptKey = (id: ServiceId): TKey => `script.${id}`

type Loaded = { facility?: Facility; isSample: boolean }

export function FacilityDetailPage() {
  const { id = '' } = useParams()
  const { t, lang } = useLanguage()
  const [state, setState] = useState<Loaded | null>(null)
  const [script, setScript] = useState<ServiceId | null>(null)

  useEffect(() => {
    let active = true
    fetchFacility(id).then((r) => {
      if (active) setState(r)
    })
    return () => {
      active = false
    }
  }, [id])

  const back = (
    <Link to="/services" className="btn btn-ghost btn-sm back-link">
      <Icon name="arrowLeft" size={16} /> {t('services.backToList')}
    </Link>
  )

  if (!state) return <div className="container page-head">{back}</div>
  const f = state.facility
  if (!f)
    return (
      <div className="container page-head">
        {back}
        <h1>{t('services.notFound')}</h1>
      </div>
    )

  const open = isOpenNow(f)

  return (
    <div className="container">
      <header className="page-head">
        {back}
        <span className="eyebrow">{t(typeKey(f.type))}</span>
        <h1>{f.name}</h1>
        <div className="chip-row">
          {hoursKnown(f) ? (
            <span className={openBadge(open)}>
              <Icon name="clock" size={14} /> {f.open24h ? t('services.open24h') : open ? t('ask.openNow') : t('services.closedNow')}
            </span>
          ) : (
            <span className="tag">
              <Icon name="clock" size={14} /> {t('services.hoursUnknown')}
            </span>
          )}
          {f.youthFriendly && <span className="tag tag-brand">{t('services.youthFriendly')}</span>}
          {state.isSample && <span className="tag">{t('ask.sampleListing')}</span>}
        </div>
      </header>

      {f.verification.status === 'sample' && (
        <div className="notice notice-warn mb-4">
          <Icon name="info" size={18} />
          <p>{t('services.sampleNote')}</p>
        </div>
      )}

      <div className="grid grid-cols-[1fr_320px] items-start gap-5 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4 [&_h2]:text-[1.3rem] [&_h3]:mt-5">
          <section className="card">
            <h2>{t('services.servicesHere')}</h2>
            <ul className={`${serviceList} grid-cols-1 [&_li]:items-start [&_li]:py-2.5`}>
              {f.services.map((s) => (
                <li key={s.id}>
                  <span>
                    {t(serviceKey(s.id))}
                    {s.note && <span className="block text-[0.85rem] font-normal text-muted">{s.note}</span>}
                    {s.likely && <span className="block text-[0.85rem] font-normal text-muted">{t('services.likely')}</span>}
                  </span>
                  <span className={`tag tag-${s.cost}`}>{t(costKey(s.cost))}</span>
                </li>
              ))}
            </ul>
            <p className="text-[0.85rem] text-muted">{t('services.costNote')}</p>
          </section>

          {f.eligibility.length > 0 && (
            <section className="card">
              <h2>{t('services.eligibility')}</h2>
              <ul className={plainList}>
                {f.eligibility.map((e) => (
                  <li key={e}>
                    <Icon name="check" size={16} /> {e}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2>{t('services.howToGo')}</h2>
            {f.referral && <p>{f.referral}</p>}

            <h3>{t('services.whatToSay')}</h3>
            <div className="chip-row">
              {f.services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="chip"
                  aria-pressed={script === s.id}
                  onClick={() => setScript(script === s.id ? null : s.id)}
                >
                  {t(serviceKey(s.id))}
                </button>
              ))}
            </div>
            {script && <blockquote className="mt-3 rounded-lg border-l-4 border-brand bg-brand-soft px-[18px] py-4 text-[1.1rem] font-semibold">“{t(scriptKey(script))}”</blockquote>}

            <h3>{t('services.bring')}</h3>
            <ul className={plainList}>
              <li>
                <Icon name="check" size={16} /> {t('services.bringInsurance')}
              </li>
              <li>
                <Icon name="check" size={16} /> {t('services.bringId')}
              </li>
              <li>
                <Icon name="check" size={16} /> {t('services.bringList')}
              </li>
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card">
            <h3>{t('services.location')}</h3>
            <p>
              {f.address}
              {f.sector && f.address !== [f.sector, f.district].join(', ') && !f.address.includes(f.sector) && (
                <>
                  <br />
                  <span className="text-[0.85rem] text-muted">
                    {f.sector}, {f.district}
                  </span>
                </>
              )}
            </p>
            <a href={directionsUrl(f)} target="_blank" rel="noreferrer" className="btn btn-primary w-full">
              <Icon name="navigation" size={18} /> {t('services.directions')}
            </a>
          </section>

          <section className="card">
            <h3>{t('services.hours')}</h3>
            <ul className={plainList}>
              {formatHours(f.hours, t, lang, f.open24h, f.hoursText).map((h) => (
                <li key={h}>
                  <Icon name="clock" size={16} /> {h}
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3>{t('services.contact')}</h3>
            {f.phone ? (
              <a href={`tel:${f.phone}`} className="btn btn-ghost w-full">
                <Icon name="phone" size={18} /> {f.phone}
              </a>
            ) : (
              <p className="text-[0.85rem] text-muted">{t('services.noPhone')}</p>
            )}
            {f.languages.length > 0 && (
              <p className="text-[0.85rem] text-muted">
                {t('services.languages')}: {f.languages.join(', ')}
              </p>
            )}
          </section>

          <p className="text-[0.85rem] text-muted">
            {f.verification.status === 'verified'
              ? `${t('services.verifiedOn')} ${f.verification.checkedOn ?? ''}${f.verification.source ? ` · ${f.verification.source}` : ''}`
              : t('services.notVerified')}
          </p>
        </aside>
      </div>
    </div>
  )
}
