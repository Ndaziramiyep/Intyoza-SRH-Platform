import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { Facility, ServiceId } from '@intyoza/shared/services/types'
import {
  costKey,
  directionsUrl,
  formatDistance,
  hoursKnown,
  isOpenNow,
  serviceKey,
  typeKey,
} from '@intyoza/shared/services/utils'
import { openBadge, serviceList } from './styles'

type Props = { facility: Facility; distance?: number; highlight: ServiceId[] }

export function FacilityCard({ facility: f, distance, highlight }: Props) {
  const { t } = useLanguage()
  const open = isOpenNow(f)
  const services = [...f.services].sort(
    (a, b) => Number(highlight.includes(b.id)) - Number(highlight.includes(a.id)),
  )

  return (
    <article className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="mb-1">
            <Link to={`/services/${f.id}`} className="text-fg no-underline hover:text-brand hover:underline">
              {f.name}
            </Link>
          </h3>
          <p className="m-0 flex flex-wrap gap-1.5 text-[0.85rem] text-muted">
            <span>{t(typeKey(f.type))}</span>
            <span>·</span>
            <span>{[f.sector, f.district].filter(Boolean).join(', ')}</span>
            {distance !== undefined && (
              <>
                <span>·</span>
                <strong>{formatDistance(distance)}</strong>
              </>
            )}
          </p>
        </div>
        {hoursKnown(f) ? (
          <span className={openBadge(open)}>
            <Icon name="clock" size={14} /> {f.open24h ? t('services.open24h') : open ? t('ask.openNow') : t('services.closedNow')}
          </span>
        ) : (
          <span className="tag">
            <Icon name="clock" size={14} /> {t('services.hoursUnknown')}
          </span>
        )}
      </div>

      <div className="chip-row">
        {f.youthFriendly && <span className="tag tag-brand">{t('services.youthFriendly')}</span>}
        {f.verification.status === 'sample' && <span className="tag">{t('ask.sampleListing')}</span>}
      </div>

      <ul className={`${serviceList} grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))]`}>
        {services.map((s) => (
          <li key={s.id} className={highlight.includes(s.id) ? 'font-bold' : ''}>
            <span title={s.likely ? t('services.likely') : undefined}>
              {t(serviceKey(s.id))}
              {s.likely && ' *'}
            </span>
            <span className={`tag tag-${s.cost}`}>{t(costKey(s.cost))}</span>
          </li>
        ))}
      </ul>

      {services.some((s) => s.likely) && <p className="m-0 text-[0.8rem] text-muted">* {t('services.likely')}</p>}

      <div className="flex flex-wrap gap-2">
        <Link to={`/services/${f.id}`} className="btn btn-sm btn-primary">
          {t('services.details')}
        </Link>
        <a href={directionsUrl(f)} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
          <Icon name="navigation" size={16} /> {t('ask.directions')}
        </a>
        {f.phone && (
          <a href={`tel:${f.phone}`} className="btn btn-sm btn-ghost">
            <Icon name="phone" size={16} /> {t('ask.call')}
          </a>
        )}
      </div>
    </article>
  )
}
