import { fill, type Lang, type TKey } from '../i18n/translations'
import type { ChatMessage, ServiceNeed, TopicId } from '../chat/types'
import type { Cost, Facility, FacilityType, Hours, ServiceId } from './types'

type Translate = (key: TKey) => string

// Translation keys for service data, so every label follows the chosen language.
export const serviceKey = (id: ServiceId) => `service.${id}` as const
export const costKey = (cost: Cost) => `cost.${cost}` as const
export const typeKey = (type: FacilityType) => `ftype.${type}` as const
export const needKey = (need: ServiceNeed) => `need.${need}` as const

/** Maps a need found in an Ask Intyoza chat to the services that meet it. */
export const NEED_TO_SERVICES: Record<ServiceNeed, ServiceId[]> = {
  'family-planning': ['family-planning'],
  'sti-hiv': ['sti-testing', 'hiv-testing', 'hiv-treatment', 'prep-pep'],
  maternal: ['maternal'],
  gbv: ['gbv'],
  counseling: ['counseling'],
  consultation: ['consultation'],
}

const TOPIC_TO_NEED: Partial<Record<TopicId, ServiceNeed>> = {
  contraception: 'family-planning',
  sti: 'sti-hiv',
  pregnancy: 'maternal',
  consent: 'gbv',
  relationships: 'counseling',
}

export function isServiceNeed(value: string | null): value is ServiceNeed {
  return value !== null && value in NEED_TO_SERVICES
}

/**
 * Suggests a service need from an Ask Intyoza conversation.
 * Only read after the user agrees; nothing leaves the device.
 */
export function needFromChat(messages: ChatMessage[]): ServiceNeed | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.escalation) return m.escalation.need
    if (m.topic && TOPIC_TO_NEED[m.topic]) return TOPIC_TO_NEED[m.topic]
  }
  return undefined
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function isOpenNow(f: Facility, now = new Date()) {
  if (f.open24h) return true
  const minutes = now.getHours() * 60 + now.getMinutes()
  return f.hours.some(
    (h) => h.days.includes(now.getDay()) && minutes >= toMinutes(h.open) && minutes < toMinutes(h.close),
  )
}

/** Short opening status, e.g. "Open until 17:00", "Open 24h" or "Closed now", in the chosen language. */
export function openStatus(f: Facility, t: Translate, now = new Date()) {
  if (f.open24h) return t('services.open24h')
  if (!hoursKnown(f)) return t('services.hoursUnknown')
  if (!isOpenNow(f, now)) return t('services.closedNow')
  const minutes = now.getHours() * 60 + now.getMinutes()
  const block = f.hours.find(
    (h) => h.days.includes(now.getDay()) && minutes >= toMinutes(h.open) && minutes < toMinutes(h.close),
  )
  return block ? fill(t('services.openUntil'), { time: block.close }) : t('ask.openNow')
}

/** Short weekday name in the chosen language (0 = Sunday). 7 January 2024 was a Sunday. */
function dayName(day: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2024, 0, 7 + day))
}

function formatDays(days: number[], lang: Lang) {
  const sorted = [...days].sort()
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
  if (consecutive && sorted.length > 2) return `${dayName(sorted[0], lang)}-${dayName(sorted[sorted.length - 1], lang)}`
  return sorted.map((d) => dayName(d, lang)).join(', ')
}

/** False when the opening hours are not known yet (then "open"/"closed" can't be shown). */
export function hoursKnown(f: Facility) {
  return Boolean(f.open24h) || f.hours.length > 0
}

export function formatHours(hours: Hours[], t: Translate, lang: Lang, open24h?: boolean, hoursText?: string): string[] {
  if (open24h) return [t('services.everyDay')]
  if (hours.length === 0) return [hoursText || t('services.hoursUnknown')]
  return hours.map((h) => `${formatDays(h.days, lang)}: ${h.open}-${h.close}`)
}

export function directionsUrl(f: Facility) {
  return `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`
}

/** Lowest cost of the given services at a facility, for sorting and badges. */
export function bestCost(f: Facility, services: ServiceId[]): Cost | undefined {
  const order: Cost[] = ['free', 'subsidized', 'paid']
  const relevant = f.services.filter((s) => services.length === 0 || services.includes(s.id))
  return order.find((c) => relevant.some((s) => s.cost === c))
}
