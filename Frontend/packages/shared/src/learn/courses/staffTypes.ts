import type { Gender } from '../../chat/types'
import type { IconName } from '../../icons'
import type { Lang } from '../../i18n/translations'
import type { Localized } from '../types'
import type { AgeGroup, CategoryTone, ContentStatus, LessonType, QuizUse, ReviewDecision, StaffCourse } from './types'

// What the staff screens edit: categories, courses, lessons in RW / EN / FR, quiz questions and
// myth-or-fact cards, the health review workflow, published versions, and the impact reports.
// Mirrors the plan's tables (category_translations, lesson_translations, quiz_questions, reviews,
// content_versions) and the /api/v1/admin endpoints.

/** Text kept per language. English is the reference; RW and EN must be filled before review. */
export type LangText<T> = Partial<Record<Lang, T>>

/** A lesson's text in one language. Which fields matter depends on the lesson type. */
export type LessonText = {
  title: string
  /** Article: short screens of 2 or 3 sentences each. */
  screens: string[]
  /** Audio and video: what the recording says. */
  transcript: string
}

export type StaffQuizQuestion = {
  id: string
  use: QuizUse
  /** Index of the correct option, the same in every language. */
  correctIndex: number
  text: LangText<{ question: string; options: string[]; explanation: string }>
}

export type StaffMythCard = {
  id: string
  isMyth: boolean
  text: LangText<{ statement: string; explanation: string }>
}

export type ReviewRecord = {
  decision: ReviewDecision
  comment: string
  reviewer: string
  createdAt: string
}

export type StaffLesson = {
  id: string
  courseId: string
  order: number
  type: LessonType
  minutes: number
  status: ContentStatus
  media?: { url: string; sizeMb: number; subtitlesUrl?: string }
  text: LangText<LessonText>
  questions: StaffQuizQuestion[]
  cards: StaffMythCard[]
  /**
   * A version is live for learners. While this edit is not yet approved and published, learners
   * keep seeing that version.
   */
  hasPublishedVersion: boolean
  lastReview?: ReviewRecord
  updatedAt: string
  updatedBy: string
}

export type StaffLessonSummary = Pick<StaffLesson, 'id' | 'order' | 'type' | 'minutes' | 'status' | 'hasPublishedVersion'> & {
  title: Localized
  /** Languages whose text is complete. */
  languages: Lang[]
}

export type StaffCourseDetail = StaffCourse & {
  whatYouLearn: Localized[]
  lessons: StaffLessonSummary[]
}

export type CategoryInput = {
  id?: string
  icon: IconName
  tone: CategoryTone
  name: Localized
  description: Localized
  visible: boolean
}

export type CourseInput = {
  id?: string
  categoryId: string
  title: Localized
  description: Localized
  /** "What you'll learn": 3 to 5 points. */
  whatYouLearn: Localized[]
  cover?: string
  ageGroups: AgeGroup[]
  givesCertificate: boolean
}

/** Every published version is kept, with who changed what and when. */
export type ContentVersion = {
  version: number
  createdAt: string
  editedBy: string
  note: string
  snapshot: StaffLesson
}

export type MediaUpload = { url: string; sizeMb: number }

// ── Reports: totals only, never one learner's answers ──────────

export type ReportFilters = {
  category?: string
  course?: string
  /** ISO dates, inclusive. */
  from?: string
  to?: string
  ageGroup?: AgeGroup
  district?: string
  gender?: Gender
}

export type LearningReport = {
  /** Learners who started at least one course. */
  reach: number
  /** Learners who finished a course ÷ learners who started it, 0 to 1. */
  completionRate: number
  /** Average after-quiz score minus average before-quiz score, in percentage points. */
  knowledgeGain: number
  /** Share answering Yes to "visited a youth corner or health centre", 0 to 1. */
  actionTaken: number
  certificates: number
  /** Learners who stopped at each lesson (of the chosen course, or of all courses by lesson position). */
  dropOff: { label: string; stopped: number }[]
  /** Completion rate per course, for the table. */
  byCourse: { courseId: string; title: string; started: number; completed: number; gain: number }[]
}
