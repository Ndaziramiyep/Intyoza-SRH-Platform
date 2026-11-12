import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Spot } from '../../components/Illustrations'
import { useLanguage } from '../../i18n/context'
import { chatStore } from '../../lib/chat/chatStore'
import type { ServiceNeed } from '@intyoza/shared/chat/types'
import type { ServiceId } from '@intyoza/shared/services/types'
import {
  NEED_TO_SERVICES,
  bestCost,
  distanceKm,
  isOpenNow,
  isServiceNeed,
  needFromChat,
  needKey,
  serviceKey,
} from '@intyoza/shared/services/utils'
import { FacilityCard } from './FacilityCard'
import { HotlinesCard } from './HotlinesCard'
import { useFacilities } from './useFacilities'

const ALL_SERVICES: ServiceId[] = [
  'consultation',
  'family-planning',
  'sti-testing',
  'hiv-testing',
  'hiv-treatment',
  'prep-pep',
  'maternal',
  'gbv',
  'counseling',
]
type Coords = { lat: number; lng: number }
type LocStatus = 'idle' | 'locating' | 'ok' | 'denied'

export function ServicesPage() {
  const { t } = useLanguage()
  const { facilities, isSample, loading } = useFacilities()
  const [params, setParams] = useSearchParams()
  const needParam = params.get('need')

  // A need passed from the Ask Intyoza chat pre-selects the matching services.
  const [appliedNeed, setAppliedNeed] = useState<ServiceNeed | null>(isServiceNeed(needParam) ? needParam : null)
  const [selected, setSelected] = useState<ServiceId[]>(appliedNeed ? NEED_TO_SERVICES[appliedNeed] : [])
  const [suggestion, setSuggestion] = useState<'ask' | 'declined' | 'none'>(() =>
    !appliedNeed && chatStore.loadChat().length > 0 ? 'ask' : 'none',
  )

  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [youthOnly, setYouthOnly] = useState(false)
  const [openNow, setOpenNow] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locStatus, setLocStatus] = useState<LocStatus>('idle')

  const districts = useMemo(() => [...new Set(facilities.map((f) => f.district))].sort(), [facilities])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return facilities
      .filter((f) => !district || f.district === district)
      .filter((f) => !q || `${f.name} ${f.sector} ${f.district} ${f.address}`.toLowerCase().includes(q))
      .filter((f) => selected.length === 0 || f.services.some((s) => selected.includes(s.id)))
      .filter((f) => !freeOnly || bestCost(f, selected) === 'free')
      .filter((f) => !youthOnly || f.youthFriendly)
      .filter((f) => !openNow || isOpenNow(f))
      .map((f) => ({ facility: f, distance: coords ? distanceKm(coords, f) : undefined }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }, [facilities, district, query, selected, freeOnly, youthOnly, openNow, coords])

  const toggleService = (id: ServiceId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const applyNeed = (need: ServiceNeed | null) => {
    setAppliedNeed(need)
    setSelected(need ? NEED_TO_SERVICES[need] : [])
    if (!need && needParam) setParams({}, { replace: true })
  }

  const acceptSuggestion = () => {
    const need = needFromChat(chatStore.loadChat())
    setSuggestion('none')
    if (need) applyNeed(need)
  }

  const locate = () => {
    if (!('geolocation' in navigator)) return setLocStatus('denied')
    setLocStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocStatus('ok')
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <div className="container">
      <header className="page-head flex items-center justify-between gap-6">
        <h1 className="m-0">{t('feature.services.title')}</h1>
        <Spot name="services" className="size-20 shrink-0 max-sm:size-14" />
      </header>

      {isSample && (
        <div className="notice notice-warn mb-4">
          <Icon name="info" size={18} />
          <p>{t('services.sampleNote')}</p>
        </div>
      )}

      {suggestion === 'ask' && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-4 border-transparent bg-brand-soft [&_p]:m-0">
          <div>
            <h3 className="mb-1 flex items-center gap-2">
              <Icon name="chat" size={18} /> {t('services.suggestTitle')}
            </h3>
            <p className="text-muted">{t('services.suggestText')}</p>
          </div>
          <div className="chip-row">
            <button type="button" className="btn btn-sm btn-primary" onClick={acceptSuggestion}>
              {t('services.suggestYes')}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSuggestion('declined')}>
              {t('services.suggestNo')}
            </button>
          </div>
        </div>
      )}

      {appliedNeed && (
        <div className="notice mb-4">
          <Icon name="check" size={18} />
          <p>
            {t('services.showingFor')} <strong>{t(needKey(appliedNeed))}</strong>.{' '}
            <button type="button" className="link-inline" onClick={() => applyNeed(null)}>
              {t('services.showAll')}
            </button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-[300px_1fr] items-start gap-5 max-[900px]:grid-cols-1">
        <aside
          className="card sticky top-[84px] flex flex-col gap-4 max-[900px]:static [&>p]:-mt-2 [&>p]:mb-0"
          aria-label="Filters"
        >
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={locate}
            disabled={locStatus === 'locating'}
          >
            <Icon name="navigation" size={18} />
            {locStatus === 'locating' ? t('services.locating') : coords ? t('services.updateLocation') : t('services.useLocation')}
          </button>
          {locStatus === 'denied' && <p className="text-[0.85rem] text-muted">{t('services.locationDenied')}</p>}
          {locStatus === 'ok' && <p className="text-[0.85rem] text-muted">{t('services.locationPrivate')}</p>}

          <div>
            <label className="label" htmlFor="svc-search">
              {t('common.search')}
            </label>
            <input
              id="svc-search"
              className="input"
              type="search"
              placeholder={t('services.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="svc-district">
              {t('services.district')}
            </label>
            <select id="svc-district" className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <fieldset className="[&_.chip]:min-h-8 [&_.chip]:px-3 [&_.chip]:py-1 [&_.chip]:text-[0.83rem]">
            <legend className="label">{t('services.whatYouNeed')}</legend>
            <div className="chip-row">
              {ALL_SERVICES.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  aria-pressed={selected.includes(id)}
                  onClick={() => toggleService(id)}
                >
                  {t(serviceKey(id))}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t('services.options')}</legend>
            <label className="check">
              <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
              {t('services.freeOnly')}
            </label>
            <label className="check">
              <input type="checkbox" checked={youthOnly} onChange={(e) => setYouthOnly(e.target.checked)} />
              {t('services.youthOnly')}
            </label>
            <label className="check">
              <input type="checkbox" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
              {t('services.openNow')}
            </label>
          </fieldset>
        </aside>

        <div className="flex flex-col gap-4">
          <p className="m-0 text-[0.85rem] text-muted" aria-live="polite">
            {loading ? t('services.loading') : `${results.length} ${t('services.found')}`}
            {coords && ` · ${t('services.sortedByDistance')}`}
          </p>

          {!loading && results.length === 0 && (
            <div className="card px-5 py-10 text-center text-muted">
              <p>{t('services.none')}</p>
            </div>
          )}

          <div className="grid gap-4">
            {results.map(({ facility, distance }) => (
              <FacilityCard key={facility.id} facility={facility} distance={distance} highlight={selected} />
            ))}
          </div>

          <HotlinesCard />
        </div>
      </div>
    </div>
  )
}
