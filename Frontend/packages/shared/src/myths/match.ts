import { MYTHS, type Myth } from './data'
import { MYTH_TEXT } from './translations'

const STOPWORDS = new Set(
  'a an the is are was were be can can’t cant you your i my me if it its of to in on at for and or do does did that this with have has not no yes true really heard someone people say said they them'.split(
    ' ',
  ),
)

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

// Each belief's search words and wording in every language, so a question in any language matches.
const searchEntry = (myth: Myth) => {
  const translations = Object.values(MYTH_TEXT[myth.id] ?? {})
  return {
    myth,
    keywords: [...myth.keywords, ...translations.flatMap((tr) => tr.keywords)].map((k) => k.toLowerCase()),
    claimWords: new Set([myth.claim, ...translations.map((tr) => tr.claim)].flatMap(tokens)),
  }
}

const SEARCH = MYTHS.map(searchEntry)

/** Scores how well a user's sentence matches each belief, best first. */
export function findMyths(text: string, limit = 3, list?: Myth[]): { myth: Myth; score: number }[] {
  const lower = text.toLowerCase()
  const words = new Set(tokens(text))
  if (words.size === 0) return []

  return (list ? list.map(searchEntry) : SEARCH).map(({ myth, keywords, claimWords }) => {
    let score = 0
    for (const kw of keywords) if (lower.includes(kw)) score += kw.includes(' ') ? 2 : 1
    for (const w of words) if (claimWords.has(w)) score += 0.5
    return { myth, score }
  })
    .filter((r) => r.score >= 1.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** Same clear myth (not a fact or half-truth) for everyone on a given day. */
export function mythOfTheDay(date = new Date(), list: Myth[] = MYTHS) {
  const myths = list.filter((m) => m.verdict === 'myth')
  return myths[Math.floor(date.getTime() / 86_400_000) % myths.length]
}
