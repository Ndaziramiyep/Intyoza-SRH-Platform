import { ApiError, apiLanguage, type IntyozaApi } from '../../api/client'
import type { Lang } from '../../i18n/translations'
import type { LearnClient, LearnStaffClient } from './client'
import type { ContentVersion, LearningReport, MediaUpload, ReportFilters, StaffCourseDetail, StaffLesson } from './staffTypes'
import type {
  Category,
  Certificate,
  CourseResult,
  ContinueTarget,
  CourseDetail,
  CourseSummary,
  FollowUp,
  Lesson,
  QuizResult,
  ReviewItem,
  StaffCategory,
  StaffCourse,
} from './types'

// The Learning Hub on the real backend: the endpoints of the Learning Hub Plan. The response bodies
// are assumed to wrap the data in a named field, as the existing endpoints do ({ courses: [...] }).
// Confirm the field names with the backend owner when the endpoints land.

const LEARN = '/api/v1/learn'
const ADMIN = '/api/v1/admin'

const enc = encodeURIComponent

const query = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v ? [[k, v]] : []))).toString()
  return q ? `?${q}` : ''
}

/** A 404 becomes null, so screens show "not found" rather than an error. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export function createHttpLearnClient(api: IntyozaApi): LearnClient {
  const get = <T>(path: string) => api.callAuthed<T>(path)
  const post = <T>(path: string, body: unknown = {}) => api.callAuthed<T>(path, { method: 'POST', body })

  return {
    categories: () => get<{ categories: Category[] }>(`${LEARN}/categories`).then((r) => r.categories),
    courses: (filters = {}) =>
      get<{ courses: CourseSummary[] }>(`${LEARN}/courses${query({ category: filters.category, age_group: filters.ageGroup })}`).then(
        (r) => r.courses,
      ),
    forYou: () => get<{ courses: CourseSummary[] }>(`${LEARN}/for-you`).then((r) => r.courses),
    course: (slug) => orNull(get<{ course: CourseDetail }>(`${LEARN}/courses/${enc(slug)}`).then((r) => r.course)),
    lesson: (id, lang) =>
      orNull(get<{ lesson: Lesson }>(`${LEARN}/lessons/${enc(id)}${query({ language: apiLanguage(lang) })}`).then((r) => r.lesson)),
    continue: () => get<{ target: ContinueTarget }>(`${LEARN}/continue`).then((r) => r.target),
    startCourse: (slug) => post<unknown>(`${LEARN}/courses/${enc(slug)}/start`).then(() => undefined),
    markLessonDone: (id, secondsSpent) => post<unknown>(`${LEARN}/lessons/${enc(id)}/done`, { secondsSpent }).then(() => undefined),
    submitQuiz: (id, kind, answers, lang) =>
      post<{ result: QuizResult }>(`${LEARN}/lessons/${enc(id)}/quiz`, { kind, answers, language: apiLanguage(lang) }).then((r) => r.result),
    courseResult: (slug) => orNull(get<{ result: CourseResult }>(`${LEARN}/courses/${enc(slug)}/result`).then((r) => r.result)),
    certificates: () => get<{ certificates: Certificate[] }>(`${LEARN}/certificates`).then((r) => r.certificates),
    dueFollowUps: () => get<{ followUps: FollowUp[] }>(`${LEARN}/follow-ups`).then((r) => r.followUps),
    answerFollowUp: (id, answer) => post<unknown>(`${LEARN}/follow-ups/${enc(id)}`, { answer }).then(() => undefined),
  }
}

export function createHttpStaffClient(api: IntyozaApi): LearnStaffClient {
  const get = <T>(path: string) => api.callAuthed<T>(path)
  const post = <T>(path: string, body: unknown = {}) => api.callAuthed<T>(path, { method: 'POST', body })
  const put = <T>(path: string, body: unknown) => api.callAuthed<T>(path, { method: 'PUT', body })
  const del = (path: string) => api.callAuthed<unknown>(path, { method: 'DELETE' }).then(() => undefined)
  const reportQuery = (f: ReportFilters) =>
    query({ category: f.category, course: f.course, from: f.from, to: f.to, age_group: f.ageGroup, district: f.district, gender: f.gender })

  return {
    categories: () => get<{ categories: StaffCategory[] }>(`${ADMIN}/categories`).then((r) => r.categories),
    saveCategory: (input) =>
      (input.id ? put<{ category: StaffCategory }>(`${ADMIN}/categories/${enc(input.id)}`, input) : post<{ category: StaffCategory }>(`${ADMIN}/categories`, input)).then(
        (r) => r.category,
      ),
    reorderCategories: (ids) => put<unknown>(`${ADMIN}/categories/order`, { ids }).then(() => undefined),
    deleteCategory: (id) => del(`${ADMIN}/categories/${enc(id)}`),

    courses: (filters = {}) => get<{ courses: StaffCourse[] }>(`${ADMIN}/courses${query({ category: filters.category })}`).then((r) => r.courses),
    course: (id) => orNull(get<{ course: StaffCourseDetail }>(`${ADMIN}/courses/${enc(id)}`).then((r) => r.course)),
    saveCourse: (input) =>
      (input.id ? put<{ course: StaffCourseDetail }>(`${ADMIN}/courses/${enc(input.id)}`, input) : post<{ course: StaffCourseDetail }>(`${ADMIN}/courses`, input)).then(
        (r) => r.course,
      ),
    reorderLessons: (courseId, lessonIds) => put<unknown>(`${ADMIN}/courses/${enc(courseId)}/lessons/order`, { ids: lessonIds }).then(() => undefined),
    addLesson: (courseId, type) => post<{ lesson: StaffLesson }>(`${ADMIN}/courses/${enc(courseId)}/lessons`, { type }).then((r) => r.lesson),
    removeLesson: (lessonId) => del(`${ADMIN}/lessons/${enc(lessonId)}`),

    lesson: (id) => orNull(get<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(id)}`).then((r) => r.lesson)),
    saveLesson: (lesson) => put<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(lesson.id)}`, lesson).then((r) => r.lesson),
    saveTranslation: (lessonId, lang, input) =>
      put<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(lessonId)}/translations/${lang}`, {
        text: input.text[lang],
        questions: input.questions.map((q) => ({ id: q.id, text: q.text[lang] })),
        cards: input.cards.map((c) => ({ id: c.id, text: c.text[lang] })),
      }).then((r) => r.lesson),
    async uploadMedia(file) {
      const form = new FormData()
      form.append('file', file)
      const res = await api.fetchAuthed(`${ADMIN}/media`, { method: 'POST', body: form })
      return ((await res.json()) as { media: MediaUpload }).media
    },
    translationQueue: () => get<{ lessons: (ReviewItem & { missing: Lang[] })[] }>(`${ADMIN}/translations`).then((r) => r.lessons),

    submitLesson: (id) => post<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(id)}/submit`).then((r) => r.lesson),
    reviews: () => get<{ reviews: ReviewItem[] }>(`${ADMIN}/reviews`).then((r) => r.reviews),
    reviewLesson: (id, decision, comment) => post<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(id)}/review`, { decision, comment }).then((r) => r.lesson),
    publishLesson: (id) => post<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(id)}/publish`).then((r) => r.lesson),
    versions: (lessonId) => get<{ versions: ContentVersion[] }>(`${ADMIN}/lessons/${enc(lessonId)}/versions`).then((r) => r.versions),
    restoreVersion: (lessonId, version) => post<{ lesson: StaffLesson }>(`${ADMIN}/lessons/${enc(lessonId)}/versions/${version}/restore`).then((r) => r.lesson),

    report: (filters) => get<{ report: LearningReport }>(`${ADMIN}/reports${reportQuery(filters)}`).then((r) => r.report),
    async exportReport(filters) {
      const res = await api.fetchAuthed(`${ADMIN}/reports/export${reportQuery(filters)}`)
      const name = res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1]
      return { blob: await res.blob(), filename: name ?? 'intyoza-learning-report.xlsx' }
    },
  }
}
