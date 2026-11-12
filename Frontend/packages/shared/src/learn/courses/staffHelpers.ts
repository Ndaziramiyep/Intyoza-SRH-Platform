import type { Lang } from '../../i18n/translations'
import type { StaffLesson } from './staffTypes'
import type { ContentStatus } from './types'

// Rules the staff screens and the sample server share, so the editor says exactly what the server
// will check.

/** Languages a lesson must have before it can be sent for health review. */
export const REQUIRED_LANGS: Lang[] = ['rw', 'en']

export const ALL_LANGS: Lang[] = ['rw', 'en', 'fr']

const filled = (text: string | undefined) => Boolean(text?.trim())

/** True when everything a learner reads in this lesson exists in `lang`. */
export function languageComplete(lesson: Pick<StaffLesson, 'type' | 'text' | 'questions' | 'cards'>, lang: Lang): boolean {
  const text = lesson.text[lang]
  if (!filled(text?.title)) return false
  switch (lesson.type) {
    case 'article':
      return (text?.screens ?? []).some(filled) && (text?.screens ?? []).every(filled)
    case 'audio':
    case 'video':
      return filled(text?.transcript)
    case 'quiz':
      return (
        lesson.questions.length > 0 &&
        lesson.questions.every((q) => {
          const t = q.text[lang]
          return filled(t?.question) && filled(t?.explanation) && (t?.options.length ?? 0) >= 2 && t!.options.every(filled)
        })
      )
    case 'myth_fact':
      return lesson.cards.length > 0 && lesson.cards.every((c) => filled(c.text[lang]?.statement) && filled(c.text[lang]?.explanation))
  }
}

/** The required languages still missing, for "can't send for review yet" messages. */
export const missingRequired = (lesson: Pick<StaffLesson, 'type' | 'text' | 'questions' | 'cards'>) =>
  REQUIRED_LANGS.filter((lang) => !languageComplete(lesson, lang))

/** A course's status from its lessons: the least advanced lesson decides. */
export function courseStatusOf(statuses: ContentStatus[]): ContentStatus {
  if (statuses.length === 0) return 'writing'
  const order: ContentStatus[] = ['writing', 'changes_requested', 'in_review', 'approved', 'published']
  return order[Math.min(...statuses.map((s) => order.indexOf(s)))]
}
