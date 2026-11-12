export type ServiceId =
  | 'consultation'
  | 'family-planning'
  | 'sti-testing'
  | 'hiv-testing'
  | 'hiv-treatment'
  | 'prep-pep'
  | 'maternal'
  | 'gbv'
  | 'counseling'

export type Cost = 'free' | 'subsidized' | 'paid' | 'unknown'

export type FacilityType = 'health-center' | 'hospital' | 'youth-corner' | 'one-stop-centre' | 'clinic'

/** Opening hours block. Days use JS numbering: 0 = Sunday … 6 = Saturday. */
export type Hours = { days: number[]; open: string; close: string }

export type Facility = {
  id: string
  name: string
  type: FacilityType
  district: string
  sector: string
  address: string
  lat: number
  lng: number
  open24h?: boolean
  /** Empty when the hours are not known yet; hoursText holds hours given as free text. */
  hours: Hours[]
  hoursText?: string
  phone?: string
  youthFriendly: boolean
  /** likely: usually available here, but not confirmed for this facility ("call to confirm"). */
  services: { id: ServiceId; cost: Cost; note?: string; likely?: boolean }[]
  eligibility: string[]
  referral: string
  languages: string[]
  verification: { status: 'verified' | 'unverified' | 'sample'; checkedOn?: string; source?: string }
}
