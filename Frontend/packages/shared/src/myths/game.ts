import { MYTHS, type Myth, type Verdict } from './data'

/** What the True or False game remembers on this device. Nothing is sent anywhere. */
export type GameStats = {
  rounds: number
  /** Answers got right, over all rounds. */
  busted: number
  bestStreak: number
  /** Days played, as YYYY-MM-DD (local time), newest last. */
  days: string[]
  /** Myths answered right at least once (for topic progress and badges). */
  known?: string[]
}

export const EMPTY_STATS: GameStats = { rounds: 0, busted: 0, bestStreak: 0, days: [], known: [] }

export const ROUND_SIZE = 10

/** Right answers needed for each level (level 1 starts at 0). */
const LEVEL_AT = [0, 10, 30]

export function levelOf(busted: number) {
  let index = 0
  LEVEL_AT.forEach((min, i) => {
    if (busted >= min) index = i
  })
  const nextAt = LEVEL_AT[index + 1]
  const from = LEVEL_AT[index]
  return {
    /** 0, 1 or 2. */
    index,
    /** Right answers still needed for the next level, or undefined at the top. */
    toNext: nextAt === undefined ? undefined : nextAt - busted,
    /** 0 to 1, progress inside this level. */
    progress: nextAt === undefined ? 1 : (busted - from) / (nextAt - from),
  }
}

export function dayKey(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Days in a row played, counting today, or up to yesterday if not played yet today. */
export function dayStreak(days: string[], today = new Date()) {
  const played = new Set(days)
  const day = new Date(today)
  if (!played.has(dayKey(day))) day.setDate(day.getDate() - 1)
  let count = 0
  while (played.has(dayKey(day))) {
    count++
    day.setDate(day.getDate() - 1)
  }
  return count
}

/** Adds a finished round to the stats. */
export function addRound(stats: GameStats, rightIds: string[], bestStreak: number, today = new Date()): GameStats {
  const key = dayKey(today)
  const days = stats.days.includes(key) ? stats.days : [...stats.days, key].slice(-60)
  return {
    rounds: stats.rounds + 1,
    busted: stats.busted + rightIds.length,
    bestStreak: Math.max(stats.bestStreak, bestStreak),
    days,
    known: [...new Set([...(stats.known ?? []), ...rightIds])],
  }
}

/** For each topic: how many of its myths the person has got right, and whether that earns its badge. */
export function topicProgress(stats: GameStats, myths: Myth[] = MYTHS) {
  const known = new Set(stats.known ?? [])
  const topics = [...new Set(myths.map((m) => m.topic))]
  return topics.map((topic) => {
    const inTopic = myths.filter((m) => m.topic === topic)
    const done = inTopic.filter((m) => known.has(m.id)).length
    return { topic, done, total: inTopic.length, badge: done === inTopic.length }
  })
}

// A round mixes the answers so pressing the same button every time does not win:
// about 4 false, 4 true and 2 partly true out of 10, as far as the list allows.
const MIX: [Verdict, number][] = [
  ['myth', 0.4],
  ['fact', 0.4],
  ['partly', 0.2],
]

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** A new round: a balanced mix of answers in random order. Missing kinds are filled from the rest. */
export function newRound(size = ROUND_SIZE, random = Math.random, myths: Myth[] = MYTHS): Myth[] {
  const picked: Myth[] = []
  for (const [verdict, share] of MIX) {
    const want = Math.round(size * share)
    picked.push(...shuffle(myths.filter((m) => m.verdict === verdict), random).slice(0, want))
  }
  const rest = shuffle(myths.filter((m) => !picked.includes(m)), random)
  picked.push(...rest.slice(0, Math.max(0, size - picked.length)))
  return shuffle(picked.slice(0, size), random)
}

/** The answer's first sentence, shown big as the fact to remember, and the rest of it. */
export function splitFact(truth: string) {
  const match = truth.match(/^(.+?[.!?])\s+(.*)$/s)
  return match ? { headline: match[1], rest: match[2] } : { headline: truth, rest: '' }
}
