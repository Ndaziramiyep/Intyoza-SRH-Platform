import type { Lang } from '../i18n/translations'
import type { IconName } from '../icons'

/** Text in English, plus any translations that have been reviewed. */
export type Localized = { en: string } & Partial<Record<Exclude<Lang, 'en'>, string>>

export type CategoryId = 'puberty-periods' | 'contraception' | 'pregnancy' | 'sti-hiv' | 'consent-relationships'

export type LearnCategory = { id: string; title: Localized; icon: IconName; tone: string }

export type Format = 'article' | 'video' | 'audio' | 'quiz' | 'myth-fact'

export type QuizQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export type MythFactCard = {
  statement: string
  isMyth: boolean
  explanation: string
}

export type LearnItem = {
  id: string
  /** A CategoryId for built-in lessons, the backend's id for published ones. */
  category: string
  format: Format
  title: Localized
  summary: Localized
  minutes: number
  body?: Localized
  /** Inline illustration shown with an article (tiny SVG, safe in low-data mode). */
  illustration?: 'cycle'
  /** Video/audio file. Not loaded until the user taps play, and never in low-data mode. */
  media?: { src?: string; sizeMb: number; transcript: Localized }
  quiz?: QuizQuestion[]
  cards?: MythFactCard[]
  /** Question to hand over to the Ask Intyoza chat for a personal follow-up. */
  askPrompt?: string
}
