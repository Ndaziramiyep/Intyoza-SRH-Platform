import type { TKey } from '../i18n/translations'
import type { AgeBand, Gender } from './types'

// The choices in the optional "about you" form, matching the backend's values.

/** UNKNOWN is shown as "Rather not say". */
export const AGE_OPTIONS: { value: AgeBand; label?: string }[] = [
  { value: 'AGE_10_14', label: '10-14' },
  { value: 'AGE_15_19', label: '15-19' },
  { value: 'AGE_20_24', label: '20-24' },
  { value: 'AGE_25_PLUS', label: '25+' },
  { value: 'UNKNOWN' },
]

export const GENDER_OPTIONS: { value: Gender; label: TKey }[] = [
  { value: 'FEMALE', label: 'profile.female' },
  { value: 'MALE', label: 'profile.male' },
  { value: 'OTHER', label: 'profile.other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'ask.ratherNotSay' },
]

/** Rwanda's four provinces and Kigali City. The value is what is sent to the backend. */
export const PROVINCES: { value: string; label: TKey }[] = [
  { value: 'Kigali City', label: 'province.kigali' },
  { value: 'Northern', label: 'province.northern' },
  { value: 'Southern', label: 'province.southern' },
  { value: 'Eastern', label: 'province.eastern' },
  { value: 'Western', label: 'province.western' },
]

/** Rwanda's 30 districts. */
export const DISTRICTS = [
  'Bugesera',
  'Burera',
  'Gakenke',
  'Gasabo',
  'Gatsibo',
  'Gicumbi',
  'Gisagara',
  'Huye',
  'Kamonyi',
  'Karongi',
  'Kayonza',
  'Kicukiro',
  'Kirehe',
  'Muhanga',
  'Musanze',
  'Ngoma',
  'Ngororero',
  'Nyabihu',
  'Nyagatare',
  'Nyamagabe',
  'Nyamasheke',
  'Nyanza',
  'Nyarugenge',
  'Nyaruguru',
  'Rubavu',
  'Ruhango',
  'Rulindo',
  'Rusizi',
  'Rutsiro',
  'Rwamagana',
]
