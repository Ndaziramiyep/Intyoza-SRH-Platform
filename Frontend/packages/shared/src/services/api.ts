import { SAMPLE_FACILITIES } from './sampleData'
import type { Cost, Facility, FacilityType, ServiceId } from './types'

export type FacilitiesResult = { facilities: Facility[]; isSample: boolean }

// Facilities come from the backend (GET /api/v1/facilities: only the ones switched on with showInApp).
// If the backend can't be reached, the sample listings are shown instead, marked as samples.
// The person's location is never sent: distances are worked out on the device.

let baseUrl = ''

/** Where the backend is ('' = same origin; the Vite dev server proxies /api to it). */
export function setFacilitiesBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, '')
}

type Availability = 'YES' | 'LIKELY' | 'NO' | 'UNKNOWN'

type ApiFacility = {
  id: string
  name: string
  facilityType?: string | null
  ownership?: string | null
  province?: string | null
  district: string
  sector?: string | null
  cell?: string | null
  address?: string | null
  latitude: number
  longitude: number
  phone?: string | null
  openingHours?: string | null
  isYouthFriendly?: Availability | null
  isIsange?: Availability | null
  verifiedAt?: string | null
  services?: { serviceName: string; status?: Availability | null; costType?: string | null }[]
}

// The backend's service names -> the app's services.
const SERVICE: Record<string, ServiceId> = {
  CONTRACEPTION: 'family-planning',
  FAMILY_PLANNING: 'family-planning',
  HIV_TESTING: 'hiv-testing',
  HIV_TREATMENT: 'hiv-treatment',
  ART: 'hiv-treatment',
  STI_TESTING: 'sti-testing',
  STI_TREATMENT: 'sti-testing',
  PREP_PEP: 'prep-pep',
  PREP: 'prep-pep',
  PEP: 'prep-pep',
  ANTENATAL_CARE: 'maternal',
  MATERNAL: 'maternal',
  MATERNAL_HEALTH: 'maternal',
  COUNSELLING: 'counseling',
  COUNSELING: 'counseling',
  GBV: 'gbv',
  GBV_SUPPORT: 'gbv',
  CONSULTATION: 'consultation',
}

const COST: Record<string, Cost> = { FREE: 'free', SUBSIDIZED: 'subsidized', PAID: 'paid' }

function facilityType(f: ApiFacility): FacilityType {
  const kind = (f.facilityType ?? '').toLowerCase()
  if (kind.includes('hospital')) return 'hospital'
  if (kind.includes('clinic') || kind.includes('dispensar') || f.ownership === 'PRIVATE') return 'clinic'
  return 'health-center'
}

function toFacility(f: ApiFacility): Facility {
  const services: Facility['services'] = []
  for (const s of f.services ?? []) {
    const id = SERVICE[s.serviceName?.toUpperCase().replace(/[\s-]+/g, '_')]
    const status = s.status ?? 'UNKNOWN'
    // Only services that are there (YES) or usually there (LIKELY); NO and UNKNOWN are not shown.
    if (!id || (status !== 'YES' && status !== 'LIKELY') || services.some((x) => x.id === id)) continue
    services.push({ id, cost: COST[s.costType ?? ''] ?? 'unknown', likely: status === 'LIKELY' })
  }
  if ((f.isIsange === 'YES' || f.isIsange === 'LIKELY') && !services.some((x) => x.id === 'gbv')) {
    services.push({ id: 'gbv', cost: 'free', note: 'Isange One Stop Centre', likely: f.isIsange === 'LIKELY' })
  }
  const sector = (f.sector ?? '').trim()
  const district = (f.district ?? '').trim()
  const cell = (f.cell ?? '').trim()
  return {
    id: f.id,
    name: f.name,
    type: facilityType(f),
    district,
    sector,
    address: f.address?.trim() || [cell, sector, district].filter(Boolean).join(', '),
    lat: f.latitude,
    lng: f.longitude,
    hours: [],
    hoursText: f.openingHours ?? undefined,
    phone: f.phone ?? undefined,
    youthFriendly: f.isYouthFriendly === 'YES',
    services,
    eligibility: [],
    referral: '',
    languages: [],
    verification: f.verifiedAt
      ? { status: 'verified', checkedOn: f.verifiedAt.slice(0, 10) }
      : { status: 'unverified' },
  }
}

// One list is shared by the services page and the chat for a few minutes, so it is fetched once.
const KEEP_MS = 5 * 60_000
let cached: { at: number; result: Promise<FacilitiesResult> } | null = null

export function fetchFacilities(): Promise<FacilitiesResult> {
  if (cached && Date.now() - cached.at < KEEP_MS) return cached.result
  const result = loadFacilities()
  cached = { at: Date.now(), result }
  // A failed load is not kept, so the next screen tries the backend again.
  void result.then((r) => {
    if (r.isSample && cached?.result === result) cached = null
  })
  return result
}

async function loadFacilities(): Promise<FacilitiesResult> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/facilities`, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { facilities?: ApiFacility[] }
    return { facilities: (data.facilities ?? []).map(toFacility), isSample: false }
  } catch {
    return { facilities: SAMPLE_FACILITIES, isSample: true }
  }
}

export async function fetchFacility(id: string): Promise<{ facility?: Facility; isSample: boolean }> {
  const { facilities, isSample } = await fetchFacilities()
  return { facility: facilities.find((f) => f.id === id), isSample }
}
