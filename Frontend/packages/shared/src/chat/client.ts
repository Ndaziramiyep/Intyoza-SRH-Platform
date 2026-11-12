import { apiLanguage, isAiUnavailable, type AiChatResponse, type IntyozaApi, type SessionDetails } from '../api/client'
import type { Lang } from '../i18n/translations'
import { answerOffline } from './guide'
import { placesNeed } from './places'
import { detectCrisis, detectEscalation } from './safety'
import type { ChatReply, ChatMessage, Escalation, ServiceNeed, TopicId, UserProfile } from './types'

export type AskInput = {
  message: string
  history: ChatMessage[]
  profile: UserProfile
  lang: Lang
  /** The backend chat this conversation belongs to. */
  sessionId?: string
  /** The message is a suggested question the user tapped. */
  suggestion?: boolean
}

export type AskResult = ChatReply & { sessionId?: string }

// The trained model's topics, mapped to the app's topics (used for related lessons).
const TOPICS: Record<string, TopicId> = {
  menstruation: 'menstruation',
  puberty: 'puberty',
  contraception: 'contraception',
  pregnancy: 'pregnancy',
  stis: 'sti',
  hiv: 'sti',
  relationships: 'relationships',
  consent_safety: 'consent',
}

// The services to suggest when the model gives its safety reply.
const SAFETY_NEEDS: Record<string, ServiceNeed> = {
  self_harm: 'counseling',
  abuse_disclosure: 'gbv',
  medical_emergency: 'consultation',
}

// Always on the emergency card, even when the model's reply does not write them.
const HELPLINES: Record<string, string[]> = {
  self_harm: ['112', '114'],
  abuse_disclosure: ['3512', '116', '112'],
  medical_emergency: ['912', '114'],
}
const DEFAULT_HELPLINES = ['112', '114']

// Helpline numbers (3-4 digits, not a year) written in the model's reply.
const PHONE = /\b(?!19\d\d|20\d\d)\d{3,4}\b/g

/** The card for a reply the model flagged. Asking for a diagnosis is not an emergency: it points to a health worker. */
function flaggedByModel(res: AiChatResponse): Escalation {
  const reason = res.escalateReason ?? ''
  if (reason === 'diagnosis_request') return { level: 'soon', reason: '', advice: '', need: 'consultation', reply: res.reply }
  const numbers = new Set([...(res.reply.match(PHONE) ?? []), ...(HELPLINES[reason] ?? DEFAULT_HELPLINES)])
  return {
    level: 'urgent',
    reason: '',
    advice: '',
    need: SAFETY_NEEDS[reason] ?? 'consultation',
    reply: res.reply,
    contacts: [...numbers].map((number) => ({ label: '', number })),
  }
}

/** Shows what the model gave, and never leaves a crisis without the emergency card. */
function fromModel(res: AiChatResponse, message: string): AskResult {
  const crisis = res.escalate ? undefined : detectCrisis(message)
  // Telling someone in crisis the question is off topic would be worse than no answer at all.
  const replaced = crisis && res.type !== 'answer' ? `${crisis.reason} ${crisis.advice}` : undefined
  const escalation = res.escalate ? flaggedByModel(res) : crisis && (replaced ? { ...crisis, reply: replaced } : crisis)
  return {
    text: replaced ?? res.reply,
    followUps: replaced ? [] : (res.suggestions ?? []),
    topic: res.topic ? TOPICS[res.topic] : undefined,
    escalation,
    // Only answers cite a guide; on other replies the source says how the model decided ("rule", "model"…).
    sources: res.type === 'answer' ? (res.sources ?? []) : [],
    disclaimer: res.disclaimer ?? undefined,
    source: 'online',
    sessionId: res.sessionId ?? undefined,
  }
}

/** The "about you" details in the backend's form, for a new account or a profile update. */
export function sessionDetails(profile: UserProfile, lang: Lang): SessionDetails {
  return { language: apiLanguage(lang), ageBand: profile.ageBand, gender: profile.gender, district: profile.district, province: profile.province }
}

/** No network: the local guide answers, and the local safety rules still show urgent help. */
function offline(input: AskInput): AskResult {
  const reply = answerOffline(input.message, input.history, input.profile)
  const escalation = detectEscalation(input.message) ?? reply.escalation
  if (escalation?.reply) {
    return { ...reply, text: escalation.reply, simple: undefined, followUps: escalation.followUps, escalation, source: 'offline' }
  }
  return { ...reply, escalation, source: 'offline' }
}

/**
 * Answers a chat message for the Ask Intyoza screen.
 *
 * With an `api`, the trained Intyoza model answers through the backend, and only what it
 * returns is shown (it runs its own safety rules). Without one, or when the backend can't
 * be reached, the local offline guide answers instead.
 */
export async function askIntyoza(input: AskInput, api?: IntyozaApi): Promise<AskResult> {
  return withPlaces(input.message, await answer(input, api))
}

/**
 * Adds nearby places when they help: the person asked where to get care, or the answer
 * says a health worker should check this. Urgent replies already open the services panel.
 */
function withPlaces(message: string, result: AskResult): AskResult {
  if (result.escalation?.level === 'urgent') return result
  const places = placesNeed(message) ?? (result.escalation?.level === 'soon' ? result.escalation.need : undefined)
  return places ? { ...result, places } : result
}

async function answer(input: AskInput, api?: IntyozaApi): Promise<AskResult> {
  if (api) {
    try {
      const res = await api.chat({ message: input.message, sessionId: input.sessionId, suggestion: input.suggestion })
      // The AI service is down: the offline guide (with its safety rules) answers instead of an apology.
      // The chat keeps its session, so the next question goes back to the model.
      if (isAiUnavailable(res)) return { ...offline(input), sessionId: res.sessionId ?? input.sessionId ?? undefined }
      return fromModel(res, input.message)
    } catch {
      // Falls through to the offline guide.
    }
  }
  return offline(input)
}
