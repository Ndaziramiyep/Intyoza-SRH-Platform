// Client-side checks that run before anything is posted. They protect people
// from exposing themselves by accident; server-side moderation still applies.

import type { TKey } from '../i18n/translations'

/** `blocked` explains why a post cannot be sent; `warnings` lists details that might identify the author (as translation keys). */
export type ModerationResult = { blocked?: TKey; warnings: TKey[] }

const PHONE = /(\+?250[\s-]?)?0?7[2389]\d[\s-]?\d{3}[\s-]?\d{3}\b/
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/
const LINK = /\bhttps?:\/\/|\bwww\./i
const SOCIAL = /\b(whatsapp|instagram|insta|facebook|snapchat|tiktok|telegram)\b.{0,20}(me|@|number|handle)/i

const IDENTIFYING: { pattern: RegExp; label: TKey }[] = [
  { pattern: /\bmy (full )?name is\b|\bnitwa\b/i, label: 'mod.name' },
  { pattern: /\b(i live (in|at|near)|my address|my house is)\b/i, label: 'mod.home' },
  { pattern: /\b(my school is|i study at|i go to .{0,30} school)\b/i, label: 'mod.school' },
]

// Kept short on purpose: the goal is to catch obvious insults, not to censor.
const ABUSIVE = /\b(stupid|idiot|slut|whore|prostitute|ugly|loser|shame on you|kill you|deserved it)\b/i

export function checkPost(text: string): ModerationResult {
  if (PHONE.test(text) || EMAIL.test(text) || SOCIAL.test(text)) {
    return {
      warnings: [],
      blocked: 'mod.contact',
    }
  }
  if (LINK.test(text)) {
    return { warnings: [], blocked: 'mod.links' }
  }
  if (ABUSIVE.test(text)) {
    return {
      warnings: [],
      blocked: 'mod.abusive',
    }
  }
  const warnings = IDENTIFYING.filter((i) => i.pattern.test(text)).map((i) => i.label)
  return { warnings }
}

const ADJECTIVES = ['Calm', 'Brave', 'Gentle', 'Bright', 'Kind', 'Steady', 'Quiet', 'Hopeful', 'Strong', 'Warm', 'Clever', 'Swift']
const NOUNS = ['Heron', 'Acacia', 'Sunbird', 'River', 'Hill', 'Kestrel', 'Lily', 'Cedar', 'Gazelle', 'Moon', 'Ibis', 'Star']

/** The same anonymous name every time for one user, so a conversation can be followed without knowing who anyone is. */
export function aliasFromId(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const adjective = ADJECTIVES[hash % ADJECTIVES.length]
  const noun = NOUNS[(hash >>> 8) % NOUNS.length]
  return `${adjective} ${noun} ${((hash >>> 16) % 90) + 10}`
}

export function randomAlias() {
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  return `${pick(ADJECTIVES)} ${pick(NOUNS)} ${Math.floor(Math.random() * 90) + 10}`
}
