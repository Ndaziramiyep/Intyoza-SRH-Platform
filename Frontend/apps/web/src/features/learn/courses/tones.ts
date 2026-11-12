import type { TKey } from '@intyoza/shared/i18n/translations'
import type { CategoryTone, ContentStatus, LessonType } from '@intyoza/shared/learn/courses/types'
import type { IconName } from '../../../components/Icon'

// Class names and labels shared by the Learning Hub screens. Colours come from the tokens in
// styles/global.css, so they follow light and dark mode.

/** Icon tile and accent of each category tone. */
export const TONE_CLASSES: Record<CategoryTone, { tile: string; text: string; border: string }> = {
  brand: { tile: 'bg-brand-soft text-brand', text: 'text-brand', border: 'border-t-brand' },
  teal: { tile: 'bg-teal-soft text-teal', text: 'text-teal', border: 'border-t-teal' },
  coral: { tile: 'bg-coral-soft text-coral', text: 'text-coral', border: 'border-t-coral' },
  amber: { tile: 'bg-amber-soft text-amber', text: 'text-amber', border: 'border-t-amber' },
}

/** Icon and label key of each lesson type (labels reuse the Learning Hub `format.*` keys). */
export const LESSON_TYPES: Record<LessonType, { icon: IconName; label: TKey }> = {
  article: { icon: 'book', label: 'format.article' },
  audio: { icon: 'headphones', label: 'format.audio' },
  video: { icon: 'play', label: 'format.video' },
  myth_fact: { icon: 'help', label: 'format.myth-fact' },
  quiz: { icon: 'check', label: 'format.quiz' },
}

/** Badge colours of the review workflow. */
export const STATUS_CLASSES: Record<ContentStatus, string> = {
  writing: 'bg-surface-2 text-muted',
  in_review: 'bg-brand-soft text-brand',
  changes_requested: 'bg-amber-soft text-amber',
  approved: 'bg-teal-soft text-teal',
  published: 'bg-success-soft text-success',
}
