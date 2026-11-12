import { findMyths } from '../myths/match'
import { COMMUNITY_HELP, GENERIC_HELP, INTENTS, TOPIC_KEYWORDS, TOPIC_STARTERS, type Intent } from './knowledge'
import type { ChatReply, ChatMessage, ServiceNeed, TopicId, UserProfile } from './types'

// Offline guide: picks the best answer from the local knowledge base.
// It keeps track of the current topic so follow-up questions like
// "what about side effects?" are understood without repeating context.

const TOPIC_TO_NEED: Record<TopicId, ServiceNeed> = {
  menstruation: 'consultation',
  puberty: 'consultation',
  contraception: 'family-planning',
  pregnancy: 'maternal',
  sti: 'sti-hiv',
  consent: 'gbv',
  relationships: 'counseling',
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ')
}

function scoreIntent(intent: Intent, text: string, currentTopic?: TopicId) {
  let score = 0
  for (const kw of intent.keywords) {
    // Phrases are more specific than single words, so they count more.
    if (text.includes(kw)) score += kw.includes(' ') ? 2 : 1
  }
  if (TOPIC_KEYWORDS[intent.topic].some((kw) => text.includes(kw))) score += 0.5
  if (currentTopic === intent.topic) score += 0.4
  // Specific answers win ties against overviews.
  if (intent.general) score -= 0.6
  return score
}

/** Topic the message is about, preferring the one already being discussed. */
function topicOf(text: string, currentTopic?: TopicId): TopicId | undefined {
  const hits = (Object.keys(TOPIC_KEYWORDS) as TopicId[]).filter((t) => TOPIC_KEYWORDS[t].some((kw) => text.includes(kw)))
  return currentTopic && hits.includes(currentTopic) ? currentTopic : hits[0]
}

const MYTH_QUESTION_RE = /\b(is it true|true that|myth|heard that|people say|they say|is it a fact)\b/

const COMMUNITY_RE =/\b(community|safe ?spaces?|support group|groups?|others like me|people like me|peers?)\b/

export function currentTopicOf(history: ChatMessage[]): TopicId | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant' && history[i].topic) return history[i].topic
  }
  return undefined
}

function personalNote(topic: TopicId, profile: UserProfile): string | undefined {
  const has = (c: UserProfile['context'][number]) => profile.context.includes(c)

  if (has('living-with-hiv')) {
    if (topic === 'pregnancy')
      return 'Because you’re living with HIV: taking ARVs every day and keeping your viral load undetectable makes the chance of passing HIV to your baby very low. Tell your antenatal care team so they can support you.'
    if (topic === 'contraception')
      return 'Because you’re living with HIV: most methods are safe with ARVs, but a few HIV medicines can make pills or implants less effective. Ask your HIV clinic which method suits your treatment.'
    if (topic === 'sti')
      return 'Because you’re living with HIV: keep taking your ARVs daily and go to your viral load check-ups. Condoms still help protect you and partners from other STIs.'
  }
  if (has('pregnant')) {
    if (topic === 'sti') return 'Because you’re pregnant: HIV and syphilis tests during antenatal care protect your baby too, they are free.'
    if (topic === 'menstruation') return 'Because you’re pregnant: you shouldn’t have periods. Any bleeding during pregnancy should be checked by a health worker.'
  }
  if (has('young-parent') && (topic === 'contraception' || topic === 'pregnancy'))
    return 'As a young parent: waiting at least 2 years before another pregnancy is healthier for you and your baby. Many methods are safe while breastfeeding.'
  if (has('sexually-active') && topic === 'sti')
    return 'Since you’re sexually active: testing every 6-12 months, and with each new partner, is a good habit.'

  if (profile.ageBand === 'AGE_10_14' && topic !== 'puberty' && topic !== 'menstruation')
    return 'Since you’re still young, it can really help to talk about this with a parent, teacher, or another adult you trust.'
  return undefined
}

function actionFor(text: string, topic: TopicId | undefined): ChatReply['action'] {
  if (/\b(myths?|misconceptions?)\b/.test(text)) return { label: 'Open Myth Buster', to: '/myths' }
  if (COMMUNITY_RE.test(text))
    return { label: 'Find your community', to: '/community' }
  if (/\b(near me|nearby|where can i|where do i|find (a|the)|clinic|health cent(er|re)|hospital)\b/.test(text))
    return { label: 'Find services near you', to: `/services${topic ? `?need=${TOPIC_TO_NEED[topic]}` : ''}` }
  return undefined
}

export function answerOffline(message: string, history: ChatMessage[], profile: UserProfile): ChatReply {
  const text = normalize(message)
  const currentTopic = currentTopicOf(history)
  const recentIntents = new Set(history.slice(-6).map((m) => m.intentId).filter(Boolean))

  const ranked = INTENTS.map((intent) => ({ intent, score: scoreIntent(intent, text, currentTopic) }))
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)

  // "Is it true that…?", answer from the Myth Buster database when a belief matches well.
  const myth = MYTH_QUESTION_RE.test(text) ? findMyths(text, 1)[0] : undefined
  if (myth && myth.score >= 2.5) {
    const m = myth.myth
    const verdict = m.verdict === 'myth' ? 'That’s a myth.' : m.verdict === 'partly' ? 'That’s only partly true.' : 'That’s true.'
    return {
      text: `${verdict} ${m.truth}\n\nWhy people believe it: ${m.whyBelieved}\n\nWhen to see a health worker: ${m.seekCare}`,
      simple: `${verdict} ${m.truth.split('. ')[0]}.`,
      followUps: ['Show me more common myths', ...(m.topic ? [TOPIC_STARTERS[m.topic]] : [])],
      topic: m.topic,
      intentId: `myth-${m.id}`,
      action: { label: 'Open Myth Buster', to: '/myths' },
      source: 'offline',
    }
  }

  if (COMMUNITY_RE.test(text) && (ranked[0]?.score ?? 0) < 2.5) {
    return { ...COMMUNITY_HELP, topic: currentTopic, action: { label: 'Find your community', to: '/community' }, source: 'offline' }
  }

  // Prefer something new if the top answer was just given and another fits almost as well.
  let intent: Intent | undefined = ranked[0]?.intent
  if (intent && recentIntents.has(intent.id) && ranked[1] && ranked[1].score >= ranked[0].score - 0.5) {
    intent = ranked[1].intent
  }

  // Nothing specific matched, but the topic is clear: give that topic's overview.
  if (!intent) {
    const topic = topicOf(text, currentTopic)
    intent = topic && INTENTS.find((i) => i.topic === topic && i.general)
  }

  if (!intent) {
    return {
      ...GENERIC_HELP,
      topic: currentTopic,
      action: actionFor(text, currentTopic),
      source: 'offline',
    }
  }

  return {
    text: intent.text,
    simple: intent.simple,
    followUps: intent.followUps,
    topic: intent.topic,
    intentId: intent.id,
    personalNote: personalNote(intent.topic, profile),
    action: actionFor(text, intent.topic),
    source: 'offline',
  }
}
