import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { ServiceNeed } from '@intyoza/shared/chat/types'
import { NEED_TO_SERVICES, directionsUrl, distanceKm, formatDistance } from '@intyoza/shared/services/utils'
import { useFacilities } from '../services/useFacilities'
import type { Coords } from './ServicesPanel'

const SHOWN = 3

type Props = {
  need: ServiceNeed
  coords: Coords | null
  locating: boolean
  onUseLocation: () => void
}

/** A short list of places under an answer, when the person asked where to get care. */
export function NearbyPlaces({ need, coords, locating, onUseLocation }: Props) {
  const { t } = useLanguage()
  const { facilities, loading } = useFacilities()
  const wanted = NEED_TO_SERVICES[need]

  const places = useMemo(
    () =>
      facilities
        .filter((f) => f.services.some((s) => wanted.includes(s.id)))
        .map((f) => ({ f, km: coords ? distanceKm(coords, f) : undefined }))
        // Nearest first when the location is shared; otherwise youth-friendly places first.
        .sort((a, b) =>
          a.km !== undefined && b.km !== undefined ? a.km - b.km : Number(b.f.youthFriendly) - Number(a.f.youthFriendly),
        )
        .slice(0, SHOWN),
    [facilities, wanted, coords],
  )

  if (loading) return null

  return (
    <section className="rounded-[20px] border border-line bg-surface p-4" aria-label={t('ask.placesTitle')}>
      <h3 className="mb-2 flex items-center gap-2 text-[0.98rem]">
        <Icon name="pin" size={18} className="text-brand" />
        {coords ? t('ask.placesNear') : t('ask.placesTitle')}
      </h3>

      {places.length === 0 ? (
        <p className="m-0 text-[0.88rem] text-muted">{t('ask.placesNone')}</p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {places.map(({ f, km }) => {
            const likely = f.services.filter((s) => wanted.includes(s.id)).every((s) => s.likely)
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[14px] bg-bg px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link to={`/services/${f.id}`} className="font-semibold text-fg no-underline hover:underline">
                    {f.name}
                  </Link>
                  <p className="m-0 text-[0.8rem] text-muted">
                    {[f.sector, f.district].filter(Boolean).join(', ')}
                    {km !== undefined && ` · ${formatDistance(km)}`}
                    {f.youthFriendly && ` · ${t('services.youthFriendly')}`}
                  </p>
                  {likely && <p className="m-0 text-[0.78rem] text-muted">{t('services.likely')}</p>}
                </div>
                <a href={directionsUrl(f)} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
                  {t('services.directions')}
                </a>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!coords && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={onUseLocation} disabled={locating}>
            {locating ? t('ask.locating') : t('ask.locationUse')}
          </button>
        )}
        <Link to={`/services?need=${need}`} className="btn btn-sm btn-primary">
          {t('ask.allServices')}
        </Link>
      </div>
    </section>
  )
}
