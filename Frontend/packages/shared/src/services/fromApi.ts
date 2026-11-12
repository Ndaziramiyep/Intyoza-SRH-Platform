import type { ApiFacility } from '../api/client'
import type { Cost, Facility, FacilityType, Hours, ServiceId } from './types'

// The backend describes a facility more simply than the screens do: services are free text and
// opening hours are one sentence. Much of what it holds can be unknown, so nothing is assumed:
// an unknown cost is not shown as free, unknown hours are not shown as closed, and a facility is
// only called youth friendly when that has been confirmed.

const SERVICE_WORDS: [RegExp, ServiceId][] = [
  [/prep|\bpep\b/i, 'prep-pep'],
  [/hiv.*(treat|care)|\barv|antiretro/i, 'hiv-treatment'],
  [/hiv/i, 'hiv-testing'],
  [/\bstis?\b|sexually|infection/i, 'sti-testing'],
  [/family|contracep|planning/i, 'family-planning'],
  [/matern|antenatal|\banc\b|pregnan|delivery/i, 'maternal'],
  [/gbv|violence|abuse|isange/i, 'gbv'],
  [/counsel|mental|psycho/i, 'counseling'],
]

function serviceId(name: string): ServiceId {
  return SERVICE_WORDS.find(([words]) => words.test(name))?.[1] ?? 'consultation'
}

const COSTS: Record<string, Cost> = { FREE: 'free', SUBSIDIZED: 'subsidized', PAID: 'paid' }

/** The services a facility may offer: anything marked as not available is left out. */
function servicesOf(f: ApiFacility): Facility['services'] {
  const services = new Map<ServiceId, Cost>()
  for (const s of f.services) {
    const id = serviceId(s.serviceName)
    if (s.status !== 'NO' && !services.has(id)) services.set(id, COSTS[s.costType] ?? 'unknown')
  }
  if (f.isIsange === 'YES' && !services.has('gbv')) services.set('gbv', 'unknown')
  return [...services].map(([id, cost]) => ({ id, cost }))
}

function facilityType(f: ApiFacility): FacilityType {
  const words = `${f.facilityType ?? ''} ${f.name}`
  if (f.isIsange === 'YES' || /one[- ]stop|isange/i.test(words)) return 'one-stop-centre'
  if (/hospital/i.test(words)) return 'hospital'
  if (/youth/i.test(words)) return 'youth-corner'
  if (/clinic|dispensary/i.test(words)) return 'clinic'
  return 'health-center'
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function parseDays(text: string): number[] {
  const range = text.match(/\b(sun|mon|tue|wed|thu|fri|sat)\w*\s*(?:-|–|to)\s*(sun|mon|tue|wed|thu|fri|sat)\w*/i)
  if (range) {
    const from = DAYS.indexOf(range[1].toLowerCase())
    const to = DAYS.indexOf(range[2].toLowerCase())
    const days = [from]
    while (days[days.length - 1] !== to) days.push((days[days.length - 1] + 1) % 7)
    return days
  }
  const named = [...text.matchAll(/\b(sun|mon|tue|wed|thu|fri|sat)\w*/gi)].map((m) => DAYS.indexOf(m[1].toLowerCase()))
  return named.length > 0 ? named : [0, 1, 2, 3, 4, 5, 6]
}

/** Reads sentences like "Mon-Fri 08:00-17:00". Anything else stays as text, so nobody is told a wrong time. */
function parseHours(text: string | null): { open24h?: boolean; hours: Hours[] } {
  if (!text) return { hours: [] }
  if (/24\s*(\/|h|hours)/i.test(text)) return { open24h: true, hours: [] }
  const times = text.match(/(\d{1,2}):(\d{2})\s*(?:-|–|to)\s*(\d{1,2}):(\d{2})/)
  if (!times) return { hours: [] }
  const pad = (hour: string, minutes: string) => `${hour.padStart(2, '0')}:${minutes}`
  return { hours: [{ days: parseDays(text), open: pad(times[1], times[2]), close: pad(times[3], times[4]) }] }
}

export function facilityFromApi(f: ApiFacility): Facility {
  return {
    id: f.id,
    name: f.name,
    type: facilityType(f),
    district: f.district,
    sector: f.sector ?? '',
    address: f.address ?? '',
    lat: f.latitude,
    lng: f.longitude,
    phone: f.phone || undefined,
    youthFriendly: f.isYouthFriendly === 'YES',
    services: servicesOf(f),
    eligibility: [],
    referral: '',
    languages: [],
    hoursText: f.openingHours ?? undefined,
    ...parseHours(f.openingHours),
    verification: f.verifiedAt ? { status: 'verified', checkedOn: f.verifiedAt.slice(0, 10) } : { status: 'unverified' },
  }
}
