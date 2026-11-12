import type { ServiceId } from '../services/types'

/** Age bands, matching the backend's AgeBand enum. */
export type AgeBand = 'UNKNOWN' | 'AGE_10_14' | 'AGE_15_19' | 'AGE_20_24' | 'AGE_25_PLUS'

export type TopicId =
  | 'menstruation'
  | 'puberty'
  | 'contraception'
  | 'pregnancy'
  | 'sti'
  | 'consent'
  | 'relationships'

/** Service categories used to hand a user over to Youth Health Connect. */
export type ServiceNeed =
  | 'family-planning'
  | 'sti-hiv'
  | 'maternal'
  | 'gbv'
  | 'counseling'
  | 'consultation'

export type HealthContext = 'sexually-active' | 'pregnant' | 'young-parent' | 'living-with-hiv'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'

/** The optional details in the "about you" form. */
export type AboutYou = {
  ageBand: AgeBand
  gender?: Gender
  district?: string
  /** One of PROVINCES (chat/about.ts). */
  province?: string
}

export type UserProfile = AboutYou & {
  context: HealthContext[]
  /** The form has been saved or skipped, so it is not offered again. */
  aboutAnswered?: boolean
}

export type Escalation = {
  level: 'urgent' | 'soon'
  reason: string
  advice: string
  need: ServiceNeed
  contacts?: { label: string; number: string }[]
  /** Time-sensitive options shown side by side, e.g. emergency contraception and PEP. */
  steps?: { title: string; text: string }[]
  /** Short reassurance under the steps, e.g. about cost. */
  note?: string
  /** Services to look for in Youth Health Connect (defaults to the need's services). */
  services?: ServiceId[]
  /** What to say at reception. No name is ever included. */
  referralNote?: string
  /** A short, caring reply that replaces the general answer (the card carries the details). */
  reply?: string
  followUps?: string[]
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Plain-language version of an assistant answer, if available. */
  simple?: string
  followUps?: string[]
  escalation?: Escalation
  /** Show places nearby for this need (the person asked where to get care). */
  places?: ServiceNeed
  topic?: TopicId
  /** Answer that matched (offline guide), used to avoid repeating itself. */
  intentId?: string
  /** A personalised line added because of the user's age or health context. */
  personalNote?: string
  /** Link to another part of the app, e.g. services or community. */
  action?: { label: string; to: string }
  source?: 'online' | 'offline'
  /** Where the trained model's answer comes from, e.g. a health guide. */
  sources?: string[]
  /** The trained model's note shown under every answer. */
  disclaimer?: string
}

export type ChatReply = Omit<ChatMessage, 'id' | 'role'>
