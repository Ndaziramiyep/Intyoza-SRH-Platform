import type { AgeBand } from '../../chat/types'
import type { AgeGroup, CourseSummary, LessonType } from './types'

export const AGE_GROUPS: AgeGroup[] = ['10-14', '15-19', '20-24']

const BAND_TO_GROUP: Partial<Record<AgeBand, AgeGroup>> = {
  AGE_10_14: '10-14',
  AGE_15_19: '15-19',
  AGE_20_24: '20-24',
}

/** The Learning Hub age group for a profile's age band. Undefined when unknown or 25+. */
export const ageGroupOf = (band: AgeBand | null | undefined): AgeGroup | undefined => (band ? BAND_TO_GROUP[band] : undefined)

/** The profile age band to save when a learner picks an age group. */
export const ageBandOf = (group: AgeGroup): AgeBand =>
  (Object.entries(BAND_TO_GROUP).find(([, g]) => g === group)?.[0] as AgeBand | undefined) ?? 'UNKNOWN'

/** Display text for an age group, with an en dash: "15–19". */
export const ageGroupLabel = (group: AgeGroup) => group.replace('-', '–')

/** Share of the course finished, 0 to 100. */
export function coursePercent(course: Pick<CourseSummary, 'progress'>): number {
  const p = course.progress
  if (!p || p.lessonsTotal === 0) return 0
  if (p.completedAt) return 100
  return Math.round((p.lessonsDone / p.lessonsTotal) * 100)
}

export type CourseState = 'not_started' | 'in_progress' | 'completed'

export function courseState(course: Pick<CourseSummary, 'progress'>): CourseState {
  if (!course.progress) return 'not_started'
  return course.progress.completedAt ? 'completed' : 'in_progress'
}

/** Lower case without accents, so "regles" finds "règles" and "Kubyara" finds "kubyara". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/**
 * True when every word of `query` appears in the course's title or description, in any of its
 * languages: young people often mix Kinyarwanda, English and French in one search.
 */
export function courseMatches(course: Pick<CourseSummary, 'title' | 'description'>, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = fold([...Object.values(course.title), ...Object.values(course.description)].filter(Boolean).join(' '))
  return words.every((word) => text.includes(word))
}

/** Lesson types that download media, so their size is shown first and low-data mode affects them. */
export const MEDIA_TYPES: LessonType[] = ['audio', 'video']
