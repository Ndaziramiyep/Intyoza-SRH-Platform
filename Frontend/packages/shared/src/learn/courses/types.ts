import type { IconName } from '../../icons'
import type { Lang } from '../../i18n/translations'
import type { Localized, MythFactCard } from '../types'

// The Learning Hub course model: Category → Course → Lessons.
// These types mirror the tables and endpoints in docs/Learning-Hub-Frontend-Roadmap.md (from the
// Intyoza Learning Hub Plan, Nov 2026). They are the contract between the screens and the backend:
// the sample client and the HTTP client both return exactly these shapes.

/** The three age groups a learner registers with. They drive the "For you" row. */
export type AgeGroup = '10-14' | '15-19' | '20-24'

export type LessonType = 'article' | 'audio' | 'video' | 'myth_fact' | 'quiz'

/** Colour family of a category, drawn from the design tokens in global.css (`tone-*`). */
export type CategoryTone = 'brand' | 'teal' | 'coral' | 'amber'

/** Writing → health review → published. An edit to a published lesson goes back to review. */
export type ContentStatus = 'writing' | 'in_review' | 'changes_requested' | 'approved' | 'published'

/** When a quiz question is asked: before the course, after it, or both. */
export type QuizUse = 'before' | 'after' | 'both'

export type QuizKind = 'before' | 'after'

export type FollowUpAnswer = 'yes' | 'no' | 'skip'

// ── Learner side ────────────────────────────────────────────────

export type Category = {
  id: string
  slug: string
  icon: IconName
  tone: CategoryTone
  order: number
  name: Localized
  description: Localized
  /** Published courses in this category. */
  courseCount: number
}

/** The learner's progress in one course. Absent when the course hasn't been started. */
export type CourseProgress = {
  startedAt: string
  completedAt?: string
  lessonsDone: number
  lessonsTotal: number
  /** The lesson to resume: the first lesson not done yet, or the last one opened. */
  nextLessonId?: string
}

/** What a course card needs. */
export type CourseSummary = {
  id: string
  slug: string
  categoryId: string
  /** Cover picture URL. Without one (or in low-data mode) the card shows the category icon. */
  cover?: string
  ageGroups: AgeGroup[]
  order: number
  givesCertificate: boolean
  title: Localized
  description: Localized
  lessonCount: number
  /** Total time of all lessons. */
  minutes: number
  /** Lesson types inside the course, for the format filter. */
  types: LessonType[]
  progress?: CourseProgress
}

export type LessonSummary = {
  id: string
  courseId: string
  order: number
  type: LessonType
  minutes: number
  title: Localized
  /** Audio and video only: shown before anything downloads. */
  mediaSizeMb?: number
  done: boolean
}

/** The course page: everything needed before pressing Start. */
export type CourseDetail = CourseSummary & {
  /** "What you'll learn": 3 to 5 points. */
  whatYouLearn: Localized[]
  /** Every published course is checked by a health worker; shown as a badge. */
  reviewed: boolean
  /** The quiz to take on Start ("what do you know already?"), when the course has one. */
  beforeQuiz?: { lessonId: string; taken: boolean }
  lessons: LessonSummary[]
}

export type QuizScore = { score: number; total: number }

/** How a course went: the before and after quiz scores (knowledge gain) and the certificate. */
export type CourseResult = {
  completed: boolean
  before?: QuizScore
  /** The latest after-quiz score. */
  after?: QuizScore
  certificate?: Certificate
}

/** A quiz question as the learner sees it. The answer comes back only after submitting. */
export type LearnerQuizQuestion = {
  id: string
  question: string
  options: string[]
  use: QuizUse
}

/** One lesson, in one language (the learner's, or English when it isn't translated yet). */
export type Lesson = {
  id: string
  courseId: string
  courseSlug: string
  order: number
  type: LessonType
  minutes: number
  title: string
  /** The language the text is in. Differs from the one asked for when there's no translation yet. */
  language: Lang
  /** Article: short screens of 2 or 3 sentences each (rich text). */
  screens?: string[]
  media?: {
    url?: string
    sizeMb: number
    transcript: string
    subtitlesUrl?: string
  }
  cards?: MythFactCard[]
  questions?: LearnerQuizQuestion[]
  /** A neutral starter question for "Have a question? Ask Intyoza". */
  askPrompt?: string
  done: boolean
}

export type QuizAnswer = { questionId: string; choice: number }

export type QuizResult = {
  kind: QuizKind
  score: number
  total: number
  results: { questionId: string; correct: boolean; correctIndex: number; explanation: string }[]
}

/** Where "Continue learning" leads. */
export type ContinueTarget =
  | { kind: 'resume'; course: CourseSummary; lessonId: string }
  | { kind: 'starter'; course: CourseSummary }
  | { kind: 'none' }

/** Asked once, 7 days after a course is finished. Never shows the course name outside the app. */
export type FollowUp = { id: string; courseId: string; dueAt: string }

export type Certificate = { code: string; courseId: string; issuedAt: string }

export type CourseFilters = { category?: string; ageGroup?: AgeGroup }

// ── Staff side ──────────────────────────────────────────────────

/** The roles of the Learning Hub plan. Learners have no staff screens. */
export type StaffRole = 'admin' | 'health_reviewer' | 'translator'

export type StaffCategory = Omit<Category, 'courseCount'> & { visible: boolean; courseCount: number }

export type StaffCourse = Omit<CourseSummary, 'progress'> & {
  status: ContentStatus
  updatedAt: string
  /** Languages filled in for every lesson of the course. */
  languages: Lang[]
}

export type ReviewDecision = 'approved' | 'changes_requested'

export type ReviewItem = {
  lessonId: string
  courseId: string
  lessonTitle: string
  courseTitle: string
  type: LessonType
  submittedAt: string
  /** True when the lesson was published before: this review is for an edit. */
  isEdit: boolean
}
