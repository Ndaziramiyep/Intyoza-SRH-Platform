import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { fill } from '@intyoza/shared/i18n/translations'
import type { Escalation } from '@intyoza/shared/chat/types'
import type { Facility, ServiceId } from '@intyoza/shared/services/types'
import {
  NEED_TO_SERVICES,
  bestCost,
  costKey,
  directionsUrl,
  distanceKm,
  formatDistance,
  isOpenNow,
  needKey,
  openStatus,
  serviceKey,
} from '@intyoza/shared/services/utils'
import { useFacilities } from '../services/useFacilities'

export type Coords = { lat: number; lng: number }

const SHOWN = 3

const chipTeal =
  'chip min-h-8 px-3 py-1 text-[0.82rem] aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-surface'
const pinBadge =
  'inline-grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[0.78rem] font-bold text-surface'
const COST_TEXT = { free: 'text-fg', subsidized: 'text-fg', paid: 'text-brand' }

/** Youth Health Connect suggestions next to an urgent chat. */
export function ServicesPanel({ escalation, coords }: { escalation: Escalation; coords: Coords | null }) {
  const { t } = useLanguage()
  const { facilities, isSample } = useFacilities()
  const suggested = escalation.services ?? NEED_TO_SERVICES[escalation.need]
  const [selected, setSelected] = useState<ServiceId[]>(suggested)
  const [freeOnly, setFreeOnly] = useState(false)
  const [openNow, setOpenNow] = useState(false)
  const [expanded, setExpanded] = useState(0)

  const results = useMemo(() => {
    return facilities
      .filter((f) => f.services.some((s) => selected.includes(s.id)))
      .filter((f) => !freeOnly || bestCost(f, selected) === 'free')
      .filter((f) => !openNow || isOpenNow(f))
      .map((f) => ({ f, km: coords ? distanceKm(coords, f) : undefined }))
      .sort((a, b) =>
        a.km !== undefined && b.km !== undefined
          ? a.km - b.km
          : Number(b.f.youthFriendly) - Number(a.f.youthFriendly),
      )
      .slice(0, SHOWN)
  }, [facilities, selected, freeOnly, openNow, coords])

  const toggle = (id: ServiceId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div>
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon name="pin" size={20} />
        </span>
        <div>
          <h2>{t('feature.services.title')}</h2>
          <p className="m-0 text-[0.82rem] text-muted">{t('ask.suggestedFromChat')}</p>
        </div>
      </header>

      <div className="chip-row my-3.5">
        {suggested.map((id) => (
          <button key={id} type="button" className={chipTeal} aria-pressed={selected.includes(id)} onClick={() => toggle(id)}>
            {t(serviceKey(id))}
          </button>
        ))}
        <button type="button" className={chipTeal} aria-pressed={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
          {t('ask.freeOnly')}
        </button>
        <button type="button" className={chipTeal} aria-pressed={openNow} onClick={() => setOpenNow((v) => !v)}>
          {t('ask.openNow')}
        </button>
      </div>

      {results.length > 0 && <ServiceMap facilities={results.map((r) => r.f)} coords={coords} />}

      <ol className="mt-3 grid gap-2.5">
        {results.map(({ f, km }, i) => (
          <li key={f.id} className="rounded-2xl border border-line bg-surface">
            {expanded === i ? (
              <ServiceDetails facility={f} km={km} index={i} selected={selected} isSample={isSample} />
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-fg"
                onClick={() => setExpanded(i)}
              >
                <span className={pinBadge}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[0.9rem]">{f.name}</strong>
                  <span className="text-[0.78rem] text-muted">
                    {km !== undefined && `${formatDistance(km)} · `}
                    {openStatus(f, t)}
                    {bestCost(f, selected) && (
                      <>
                        {' · '}
                        <em className={`font-semibold not-italic ${COST_TEXT[bestCost(f, selected)!]}`}>{t(costKey(bestCost(f, selected)!))}</em>
                      </>
                    )}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} />
              </button>
            )}
          </li>
        ))}
      </ol>

      {results.length === 0 && (
        <p className="text-[0.9rem]">
          {t('ask.noServices')} <Link to="/services">{t('ask.allServices')}</Link>
        </p>
      )}

      <div className="mt-3.5 rounded-2xl bg-brand-soft p-3.5">
        <h3 className="mb-1.5 text-[0.92rem] text-brand">{t('ask.referralTitle')}</h3>
        <p className="mb-1.5 text-[0.9rem]">
          {t('ask.referralShow')} “{escalation.referralNote ?? fill(t('ask.referralDefault'), { need: t(needKey(escalation.need)) })}”
        </p>
        <p className="m-0 text-[0.85rem] text-muted">{t('ask.referralPrivate')}</p>
      </div>
    </div>
  )
}

function ServiceDetails({
  facility: f,
  km,
  index,
  selected,
  isSample,
}: {
  facility: Facility
  km?: number
  index: number
  selected: ServiceId[]
  isSample: boolean
}) {
  const { t } = useLanguage()
  const cost = bestCost(f, selected)
  const matching = f.services.filter((s) => selected.includes(s.id))

  return (
    <article className="p-3.5">
      <h3 className="m-0 flex items-start gap-2.5 text-[0.95rem]">
        <span className={pinBadge}>{index + 1}</span>
        <Link to={`/services/${f.id}`} className="text-fg no-underline hover:underline">
          {f.name}
        </Link>
      </h3>
      <p className="mt-0.5 mb-2.5 ml-[34px] text-[0.78rem] text-muted">
        {km !== undefined && `${formatDistance(km)} · `}
        {openStatus(f, t)}
        {/* "Verified" only when someone checked it; "Sample" only for the built-in list. */}
        {f.verification.status === 'verified'
          ? ` · ${t('ask.verified')} ${f.verification.checkedOn ?? ''}`
          : isSample && ` · ${t('ask.sampleListing')}`}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {cost === 'free' && <span className="tag tag-free">{t('cost.free').toUpperCase()}</span>}
        {matching.map((s) => (
          <span key={s.id} className="tag">
            {t(serviceKey(s.id))}
          </span>
        ))}
      </div>
      {f.eligibility[0] && (
        <p className="my-2.5 text-[0.82rem] text-muted">
          {t('ask.whoCanGo')}: {f.eligibility[0]}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <a href={directionsUrl(f)} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
          {t('ask.directions')}
        </a>
        {f.phone && (
          <a href={`tel:${f.phone}`} className="btn btn-sm btn-outline">
            {t('ask.call')}
          </a>
        )}
      </div>
    </article>
  )
}

/**
 * Schematic map: places the suggested services relative to each other (and to
 * the person, if they shared their location). No map tiles are downloaded.
 */
function ServiceMap({ facilities, coords }: { facilities: Facility[]; coords: Coords | null }) {
  const { t } = useLanguage()
  const W = 320
  const H = 150
  const PAD = 22
  const points: Coords[] = [...facilities, ...(coords ? [coords] : [])]
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  const x = (lng: number) => PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (W - PAD * 2)
  const y = (lat: number) => PAD + ((maxLat - lat) / (maxLat - minLat || 1)) * (H - PAD * 2)

  return (
    <svg className="block h-auto w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('ask.mapLabel')}>
      <rect width={W} height={H} rx="16" className="fill-brand-soft" />
      <path d={`M0 ${H * 0.42}H${W} M${W * 0.45} 0V${H} M${W * 0.75} 0V${H}`} className="fill-none stroke-surface stroke-10" />
      {coords && <circle cx={x(coords.lng)} cy={y(coords.lat)} r="9" className="fill-brand stroke-surface stroke-3" />}
      {facilities.map((f, i) => (
        <g key={f.id} transform={`translate(${x(f.lng)} ${y(f.lat)})`}>
          <path d="M-11 -11h22v16a6 6 0 0 1-6 6h-10a6 6 0 0 1-6-6z" className={i === 0 ? 'fill-brand' : 'fill-muted'} />
          <text y="3" textAnchor="middle" className="fill-surface text-[11px] font-bold">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  )
}
