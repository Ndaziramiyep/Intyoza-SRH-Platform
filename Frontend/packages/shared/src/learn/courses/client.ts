import type { Lang } from '../../i18n/translations'
import type {
  Category,
  Certificate,
  CourseResult,
  ContinueTarget,
  CourseDetail,
  CourseFilters,
  CourseSummary,
  FollowUp,
  FollowUpAnswer,
  Lesson,
  QuizAnswer,
  QuizKind,
  QuizResult,
  ReviewItem,
  LessonType,
  ReviewDecision,
  StaffCategory,
  StaffCourse,
} from './types'
import type {
  CategoryInput,
  ContentVersion,
  CourseInput,
  LearningReport,
  MediaUpload,
  ReportFilters,
  StaffCourseDetail,
  StaffLesson,
} from './staffTypes'

/**
 * Everything the Learning Hub screens ask the backend for. One method per endpoint of the plan, so
 * the screens never call `fetch` themselves. Two implementations share this shape:
 * `createSampleLearnClient` (sample data, progress kept on the device) and `createHttpLearnClient`
 * (the real API). Swapping one for the other changes no screen.
 *
 * Every learner method needs a signed-in learner.
 */
export type LearnClient = {
  /** GET /api/v1/learn/categories — visible categories, with the number of courses in each. */
  categories(): Promise<Category[]>
  /** GET /api/v1/learn/courses?category=&age_group= — with the learner's progress per course. */
  courses(filters?: CourseFilters): Promise<CourseSummary[]>
  /** GET /api/v1/learn/for-you — courses for the learner's registered age group. */
  forYou(): Promise<CourseSummary[]>
  /** GET /api/v1/learn/courses/:slug — the course page, with its lessons. Null when not found. */
  course(slug: string): Promise<CourseDetail | null>
  /** GET /api/v1/learn/lessons/:id — one lesson in the learner's language. Null when not found. */
  lesson(id: string, lang: Lang): Promise<Lesson | null>
  /** GET /api/v1/learn/continue — the lesson to resume, or a starter course for a new learner. */
  continue(): Promise<ContinueTarget>
  /** POST /api/v1/learn/courses/:slug/start */
  startCourse(slug: string): Promise<void>
  /** POST /api/v1/learn/lessons/:id/done */
  markLessonDone(id: string, secondsSpent?: number): Promise<void>
  /** POST /api/v1/learn/lessons/:id/quiz — returns the score and explanations. */
  submitQuiz(id: string, kind: QuizKind, answers: QuizAnswer[], lang: Lang): Promise<QuizResult>
  /** Proposed GET /api/v1/learn/courses/:slug/result — quiz scores and certificate for the completion screen. */
  courseResult(slug: string): Promise<CourseResult | null>
  /** Proposed GET /api/v1/learn/certificates — the learner's certificates. */
  certificates(): Promise<Certificate[]>
  /** Proposed GET /api/v1/learn/follow-ups — follow-up questions that are due. */
  dueFollowUps(): Promise<FollowUp[]>
  /** POST /api/v1/learn/follow-ups/:id */
  answerFollowUp(id: string, answer: FollowUpAnswer): Promise<void>
}

/**
 * Staff screens: admins write and publish, health reviewers approve or send back, translators fill
 * in RW and FR. The server checks the role on every call; the screens only hide what a role can't do.
 */
export type LearnStaffClient = {
  // Categories (admin)
  /** Every category, hidden ones included. */
  categories(): Promise<StaffCategory[]>
  /** POST /admin/categories (new) or PUT /admin/categories/:id. */
  saveCategory(input: CategoryInput): Promise<StaffCategory>
  /** PUT /admin/categories/order */
  reorderCategories(ids: string[]): Promise<void>
  /** DELETE /admin/categories/:id — refused while the category has courses. */
  deleteCategory(id: string): Promise<void>

  // Courses (admin)
  /** Every course in every status. */
  courses(filters?: { category?: string }): Promise<StaffCourse[]>
  /** GET /admin/courses/:id — with its lessons. Null when not found. */
  course(id: string): Promise<StaffCourseDetail | null>
  /** POST /admin/courses (new) or PUT /admin/courses/:id. */
  saveCourse(input: CourseInput): Promise<StaffCourseDetail>
  /** PUT /admin/courses/:id/lessons/order */
  reorderLessons(courseId: string, lessonIds: string[]): Promise<void>
  /** POST /admin/courses/:id/lessons — a new empty lesson at the end. */
  addLesson(courseId: string, type: LessonType): Promise<StaffLesson>
  /** DELETE /admin/lessons/:id */
  removeLesson(lessonId: string): Promise<void>

  // Lessons (admin; translators only their languages)
  /** GET /admin/lessons/:id — every language. Null when not found. */
  lesson(id: string): Promise<StaffLesson | null>
  /** PUT /admin/lessons/:id — an edit to a published lesson goes back through review. */
  saveLesson(lesson: StaffLesson): Promise<StaffLesson>
  /** PUT /admin/lessons/:id/translations/:language (translator) */
  saveTranslation(lessonId: string, lang: Lang, lesson: Pick<StaffLesson, 'text' | 'questions' | 'cards'>): Promise<StaffLesson>
  /** POST /admin/media — audio, video or a cover picture. */
  uploadMedia(file: File): Promise<MediaUpload>
  /** Lessons still missing their RW or FR text (translator's list). */
  translationQueue(): Promise<(ReviewItem & { missing: Lang[] })[]>

  // Review workflow
  /** POST /admin/lessons/:id/submit — refused until RW and EN are filled. */
  submitLesson(id: string): Promise<StaffLesson>
  /** GET /admin/reviews — lessons waiting for health review. */
  reviews(): Promise<ReviewItem[]>
  /** POST /admin/lessons/:id/review (health reviewer) — a comment is required to request changes. */
  reviewLesson(id: string, decision: ReviewDecision, comment: string): Promise<StaffLesson>
  /** POST /admin/lessons/:id/publish — only an approved lesson. */
  publishLesson(id: string): Promise<StaffLesson>
  /** GET /admin/lessons/:id/versions — every published version, newest first. */
  versions(lessonId: string): Promise<ContentVersion[]>
  /** POST /admin/lessons/:id/versions/:version/restore — becomes a draft that needs review again. */
  restoreVersion(lessonId: string, version: number): Promise<StaffLesson>

  // Reports (admin): totals only
  /** GET /admin/reports */
  report(filters: ReportFilters): Promise<LearningReport>
  /** GET /admin/reports/export — a spreadsheet file. */
  exportReport(filters: ReportFilters): Promise<{ blob: Blob; filename: string }>
}
