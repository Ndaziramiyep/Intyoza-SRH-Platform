import type { Lang } from '../../i18n/translations'
import type { KeyValueStore } from '../../storage'
import type { Localized } from '../types'
import type { LearnStaffClient } from './client'
import { COURSES, toScreens, type IndexedCourse, type IndexedLesson } from './sampleClient'
import { SAMPLE_CATEGORIES } from './sampleData'
import { ALL_LANGS, courseStatusOf, languageComplete, missingRequired } from './staffHelpers'
import type {
  CategoryInput,
  ContentVersion,
  CourseInput,
  LearningReport,
  LessonText,
  ReportFilters,
  StaffCourseDetail,
  StaffLesson,
  StaffLessonSummary,
} from './staffTypes'
import type { ContentStatus, LessonType, ReviewItem, StaffCategory, StaffCourse } from './types'

// The staff screens on sample data, until the backend has the /api/v1/admin endpoints. It starts
// from the sample courses and keeps every edit in `store` (this device only), and it applies the
// same rules as the server: RW and EN filled before review, a comment to request changes, only an
// approved lesson can be published, an edit to a published lesson goes back through review, and a
// category with courses can't be deleted. Report numbers are made up, but stable for each filter.

type Options = {
  store: KeyValueStore
  /** Shown as "who changed it" in versions and reviews. */
  actor: () => string
  latencyMs?: number
  now?: () => Date
}

type CategoryRecord = CategoryInput & { id: string; slug: string; order: number }
type CourseRecord = CourseInput & { id: string; slug: string; order: number; updatedAt: string }
type State = { categories: CategoryRecord[]; courses: CourseRecord[]; lessons: StaffLesson[]; versions: Record<string, ContentVersion[]> }

const STORE_KEY = 'intyoza.staff.sample'

/** An error the screens can explain: the code says which rule refused the change. */
export type StaffRule = 'MISSING_LANGUAGES' | 'NOT_IN_REVIEW' | 'NOT_APPROVED' | 'COMMENT_REQUIRED' | 'CATEGORY_HAS_COURSES' | 'NOT_FOUND'

export class StaffRuleError extends Error {
  code: StaffRule
  constructor(code: StaffRule) {
    super(code)
    this.code = code
  }
}

/** A deep copy, so the screens never hold the saved state itself. Nothing to copy for void results. */
const clone = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T))

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'item'

function uniqueSlug(base: string, taken: string[]) {
  let slug = slugify(base)
  for (let n = 2; taken.includes(slug); n++) slug = `${slugify(base)}-${n}`
  return slug
}

// ── Seed: the sample courses as staff content ──────────────────

/** How far each sample course is in the workflow, from how much of it is written. */
function seedStatus(c: IndexedCourse): ContentStatus {
  const written = c.lessons.filter((l) => l.item).length / c.lessons.length
  if (written >= 0.75) return 'published'
  if (written >= 0.5) return 'in_review'
  if (written > 0) return 'changes_requested'
  return 'writing'
}

function seedLesson(c: IndexedCourse, l: IndexedLesson, at: string): StaffLesson {
  const item = l.item
  const text: Partial<Record<Lang, LessonText>> = {}
  for (const lang of ALL_LANGS) {
    const title = l.title[lang]
    if (!title) continue
    text[lang] = {
      title,
      screens: item?.body?.[lang] ? toScreens(item.body[lang]!) : lang === 'en' && !item && l.type === 'article' ? [''] : [],
      transcript: item?.media?.transcript[lang] ?? '',
    }
  }
  const courseStatus = seedStatus(c)
  // Courses that are mostly written count as live, placeholders included, so every status appears.
  const status: ContentStatus = item ? 'published' : courseStatus
  return {
    id: l.id,
    courseId: c.id,
    order: l.order,
    type: l.type,
    minutes: l.minutes,
    status,
    media: l.type === 'audio' || l.type === 'video' ? { url: item?.media?.src ?? '', sizeMb: l.sizeMb ?? 0 } : undefined,
    text,
    // The app's quiz questions and myth-or-fact cards are written in English for now.
    questions: (item?.quiz ?? []).map((q, i) => ({
      id: `${l.id}-q${i + 1}`,
      use: l.use,
      correctIndex: q.answer,
      text: { en: { question: q.question, options: q.options, explanation: q.explanation } },
    })),
    cards: (item?.cards ?? []).map((card, i) => ({
      id: `${l.id}-c${i + 1}`,
      isMyth: card.isMyth,
      text: { en: { statement: card.statement, explanation: card.explanation } },
    })),
    hasPublishedVersion: status === 'published',
    lastReview:
      status === 'changes_requested'
        ? { decision: 'changes_requested', comment: 'Please add the Kinyarwanda version and one sentence on where to get help.', reviewer: 'Health reviewer', createdAt: at }
        : undefined,
    updatedAt: at,
    updatedBy: 'Content writer',
  }
}

function seed(at: string): State {
  const lessons = COURSES.flatMap((c) => c.lessons.map((l) => seedLesson(c, l, at)))
  const versions: State['versions'] = {}
  for (const lesson of lessons.filter((l) => l.hasPublishedVersion)) {
    versions[lesson.id] = [{ version: 1, createdAt: at, editedBy: 'Content writer', note: 'Published', snapshot: clone(lesson) }]
  }
  return {
    categories: SAMPLE_CATEGORIES.map((c, order) => ({ ...c, slug: c.id, order, visible: true })),
    courses: COURSES.map((c) => ({
      id: c.id,
      slug: c.def.slug,
      order: c.order,
      categoryId: c.def.category,
      title: c.def.title,
      description: c.def.description,
      whatYouLearn: c.def.whatYouLearn,
      ageGroups: c.def.ageGroups,
      givesCertificate: Boolean(c.def.certificate),
      updatedAt: at,
    })),
    lessons,
    versions,
  }
}

// ── Sample reports: made-up numbers, stable for the same filters ──

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}
/** A number from 0 to 1 that is always the same for the same key. */
const noise = (key: string) => (hash(key) % 10_000) / 10_000

function sampleReport(state: State, filters: ReportFilters): LearningReport {
  const days = filters.from && filters.to ? Math.max(1, (Date.parse(filters.to) - Date.parse(filters.from)) / 86_400_000 + 1) : 90
  const scale = Math.min(1, days / 90) * (filters.ageGroup ? 0.38 : 1) * (filters.district ? 0.06 : 1) * (filters.gender ? 0.5 : 1)
  const key = JSON.stringify(filters)
  const courses = state.courses
    .filter((c) => !filters.category || c.categoryId === filters.category)
    .filter((c) => !filters.course || c.id === filters.course)

  const byCourse = courses.map((c) => {
    const started = Math.round((140 + noise(`${c.id}:s`) * 380) * scale)
    const completed = Math.round(started * (0.48 + noise(`${c.id}:${key}:c`) * 0.32))
    const gain = Math.round(12 + noise(`${c.id}:g`) * 24)
    return { courseId: c.id, title: c.title.en, started, completed, gain, certificate: c.givesCertificate }
  })
  const started = byCourse.reduce((sum, c) => sum + c.started, 0)
  const completed = byCourse.reduce((sum, c) => sum + c.completed, 0)
  const lessonsOf = (courseId: string) => state.lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order)

  // Where learners stop: lessons of the chosen course, or lesson positions across courses.
  const dropOff = filters.course
    ? lessonsOf(filters.course).map((l, i) => ({
        label: `${l.order}. ${l.text.en?.title || 'Untitled'}`,
        stopped: Math.round((started - completed) * (0.12 + noise(`${l.id}:d`) * 0.3) * (i === 0 ? 1.4 : 1)),
      }))
    : [1, 2, 3, 4, 5].map((n) => ({ label: `Lesson ${n}`, stopped: Math.round((started - completed) * [0.34, 0.24, 0.18, 0.14, 0.1][n - 1]) }))

  return {
    reach: Math.round(started * 0.78),
    completionRate: started ? completed / started : 0,
    knowledgeGain: byCourse.length ? byCourse.reduce((sum, c) => sum + c.gain * c.completed, 0) / Math.max(1, completed) : 0,
    actionTaken: started ? 0.22 + noise(`${key}:a`) * 0.2 : 0,
    certificates: byCourse.filter((c) => c.certificate).reduce((sum, c) => sum + c.completed, 0),
    dropOff,
    byCourse: byCourse.map(({ certificate: _certificate, ...c }) => c),
  }
}

/** The report as CSV with a byte-order mark, which Excel opens directly with accents intact. */
function reportCsv(report: LearningReport, filters: ReportFilters) {
  const cell = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows: (string | number)[][] = [
    ['Intyoza Learning Hub report', ''],
    ['Filters', Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('; ') || 'none'],
    [],
    ['Measure', 'Value'],
    ['Reach (learners who started a course)', report.reach],
    ['Completion rate (%)', Math.round(report.completionRate * 100)],
    ['Knowledge gain (points)', Math.round(report.knowledgeGain)],
    ['Action taken (%)', Math.round(report.actionTaken * 100)],
    ['Certificates', report.certificates],
    [],
    ['Course', 'Started', 'Completed', 'Completion rate (%)', 'Knowledge gain (points)'],
    ...report.byCourse.map((c) => [c.title, c.started, c.completed, c.started ? Math.round((c.completed / c.started) * 100) : 0, c.gain]),
    [],
    ['Where learners stopped', 'Learners'],
    ...report.dropOff.map((d) => [d.label, d.stopped]),
  ]
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

// ── The client ─────────────────────────────────────────────────

export function createSampleStaffClient({ store, actor, latencyMs = 200, now = () => new Date() }: Options): LearnStaffClient {
  const stamp = () => now().toISOString()
  const load = (): State => store.get<State>(STORE_KEY) ?? seed(stamp())
  const save = (state: State) => store.set(STORE_KEY, state)
  /** Runs `change` on the saved state after a short delay, as a network call would. The result is a copy. */
  const later = <T>(change: (state: State) => T) =>
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        try {
          const state = load()
          const result = change(state)
          save(state)
          resolve(clone(result))
        } catch (err) {
          reject(err)
        }
      }, latencyMs),
    )

  const findLesson = (state: State, id: string) => {
    const lesson = state.lessons.find((l) => l.id === id)
    if (!lesson) throw new StaffRuleError('NOT_FOUND')
    return lesson
  }
  const lessonsOf = (state: State, courseId: string) => state.lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order)

  const summary = (l: StaffLesson): StaffLessonSummary => ({
    id: l.id,
    order: l.order,
    type: l.type,
    minutes: l.minutes,
    status: l.status,
    hasPublishedVersion: l.hasPublishedVersion,
    title: Object.fromEntries(ALL_LANGS.flatMap((lang) => (l.text[lang]?.title ? [[lang, l.text[lang]!.title]] : []))) as Localized,
    languages: ALL_LANGS.filter((lang) => languageComplete(l, lang)),
  })

  function staffCourse(state: State, c: CourseRecord): StaffCourse {
    const lessons = lessonsOf(state, c.id)
    return {
      id: c.id,
      slug: c.slug,
      categoryId: c.categoryId,
      cover: c.cover,
      ageGroups: c.ageGroups,
      order: c.order,
      givesCertificate: c.givesCertificate,
      title: c.title,
      description: c.description,
      lessonCount: lessons.length,
      minutes: lessons.reduce((sum, l) => sum + l.minutes, 0),
      types: [...new Set(lessons.map((l) => l.type))],
      status: courseStatusOf(lessons.map((l) => l.status)),
      updatedAt: lessons.reduce((latest, l) => (l.updatedAt > latest ? l.updatedAt : latest), c.updatedAt),
      languages: ALL_LANGS.filter((lang) => lessons.length > 0 && lessons.every((l) => languageComplete(l, lang))),
    }
  }

  const courseDetail = (state: State, c: CourseRecord): StaffCourseDetail => ({
    ...staffCourse(state, c),
    whatYouLearn: c.whatYouLearn,
    lessons: lessonsOf(state, c.id).map(summary),
  })

  const reviewItem = (state: State, l: StaffLesson): ReviewItem => {
    const course = state.courses.find((c) => c.id === l.courseId)
    return {
      lessonId: l.id,
      courseId: l.courseId,
      lessonTitle: l.text.en?.title || 'Untitled lesson',
      courseTitle: course?.title.en ?? '',
      type: l.type,
      submittedAt: l.updatedAt,
      isEdit: l.hasPublishedVersion,
    }
  }

  /** Any change to approved, published or in-review content sends it back to writing. */
  const touch = (lesson: StaffLesson) => {
    if (lesson.status !== 'changes_requested') lesson.status = 'writing'
    lesson.updatedAt = stamp()
    lesson.updatedBy = actor()
  }

  return {
    categories: () =>
      later((state): StaffCategory[] =>
        [...state.categories]
          .sort((a, b) => a.order - b.order)
          .map((c) => ({ ...c, courseCount: state.courses.filter((course) => course.categoryId === c.id).length })),
      ),

    saveCategory: (input) =>
      later((state): StaffCategory => {
        let record = state.categories.find((c) => c.id === input.id)
        if (record) Object.assign(record, input)
        else {
          const slug = uniqueSlug(input.name.en, state.categories.map((c) => c.slug))
          record = { ...input, id: slug, slug, order: state.categories.length }
          state.categories.push(record)
        }
        return { ...record, courseCount: state.courses.filter((c) => c.categoryId === record!.id).length }
      }),

    reorderCategories: (ids) =>
      later((state) => {
        for (const c of state.categories) c.order = ids.indexOf(c.id)
      }),

    deleteCategory: (id) =>
      later((state) => {
        if (state.courses.some((c) => c.categoryId === id)) throw new StaffRuleError('CATEGORY_HAS_COURSES')
        state.categories = state.categories.filter((c) => c.id !== id)
        state.categories.sort((a, b) => a.order - b.order).forEach((c, i) => (c.order = i))
      }),

    courses: (filters = {}) =>
      later((state) =>
        [...state.courses]
          .filter((c) => !filters.category || c.categoryId === filters.category)
          .sort((a, b) => state.categories.findIndex((x) => x.id === a.categoryId) - state.categories.findIndex((x) => x.id === b.categoryId) || a.order - b.order)
          .map((c) => staffCourse(state, c)),
      ),

    course: (id) =>
      later((state) => {
        const c = state.courses.find((course) => course.id === id)
        return c ? courseDetail(state, c) : null
      }),

    saveCourse: (input) =>
      later((state) => {
        let record = state.courses.find((c) => c.id === input.id)
        if (record) Object.assign(record, input, { updatedAt: stamp() })
        else {
          const slug = uniqueSlug(input.title.en, state.courses.map((c) => c.slug))
          record = { ...input, id: slug, slug, order: state.courses.filter((c) => c.categoryId === input.categoryId).length, updatedAt: stamp() }
          state.courses.push(record)
        }
        return courseDetail(state, record)
      }),

    reorderLessons: (courseId, lessonIds) =>
      later((state) => {
        for (const l of lessonsOf(state, courseId)) l.order = lessonIds.indexOf(l.id) + 1
      }),

    addLesson: (courseId, type: LessonType) =>
      later((state) => {
        const order = lessonsOf(state, courseId).length + 1
        const lesson: StaffLesson = {
          id: `${courseId}--${Date.now().toString(36)}`,
          courseId,
          order,
          type,
          minutes: type === 'myth_fact' ? 2 : 3,
          status: 'writing',
          media: type === 'audio' || type === 'video' ? { url: '', sizeMb: 0 } : undefined,
          text: { en: { title: '', screens: type === 'article' ? [''] : [], transcript: '' } },
          questions: [],
          cards: [],
          hasPublishedVersion: false,
          updatedAt: stamp(),
          updatedBy: actor(),
        }
        state.lessons.push(lesson)
        return lesson
      }),

    removeLesson: (lessonId) =>
      later((state) => {
        const lesson = findLesson(state, lessonId)
        state.lessons = state.lessons.filter((l) => l.id !== lessonId)
        lessonsOf(state, lesson.courseId).forEach((l, i) => (l.order = i + 1))
      }),

    lesson: (id) => later((state) => state.lessons.find((l) => l.id === id) ?? null),

    saveLesson: (input) =>
      later((state) => {
        const lesson = findLesson(state, input.id)
        Object.assign(lesson, {
          minutes: input.minutes,
          media: input.media,
          text: input.text,
          questions: input.questions,
          cards: input.cards,
        })
        touch(lesson)
        return lesson
      }),

    saveTranslation: (lessonId, lang, input) =>
      later((state) => {
        const lesson = findLesson(state, lessonId)
        // A translator changes one language only; the structure (answers, order) stays as written.
        if (input.text[lang]) lesson.text[lang] = input.text[lang]
        for (const q of lesson.questions) {
          const t = input.questions.find((x) => x.id === q.id)?.text[lang]
          if (t) q.text[lang] = t
        }
        for (const c of lesson.cards) {
          const t = input.cards.find((x) => x.id === c.id)?.text[lang]
          if (t) c.text[lang] = t
        }
        touch(lesson)
        return lesson
      }),

    uploadMedia: (file) =>
      later(() => ({
        // Kept in this browser only; the backend stores the file and returns its address.
        url: URL.createObjectURL(file),
        sizeMb: Math.round((file.size / 1_000_000) * 10) / 10,
      })),

    translationQueue: () =>
      later((state) =>
        state.lessons
          .map((l) => ({ lesson: l, missing: (['rw', 'fr'] as Lang[]).filter((lang) => !languageComplete(l, lang)) }))
          .filter((x) => x.missing.length > 0)
          .map(({ lesson, missing }) => ({ ...reviewItem(state, lesson), missing })),
      ),

    submitLesson: (id) =>
      later((state) => {
        const lesson = findLesson(state, id)
        if (missingRequired(lesson).length > 0) throw new StaffRuleError('MISSING_LANGUAGES')
        lesson.status = 'in_review'
        lesson.updatedAt = stamp()
        return lesson
      }),

    reviews: () => later((state) => state.lessons.filter((l) => l.status === 'in_review').map((l) => reviewItem(state, l))),

    reviewLesson: (id, decision, comment) =>
      later((state) => {
        const lesson = findLesson(state, id)
        if (lesson.status !== 'in_review') throw new StaffRuleError('NOT_IN_REVIEW')
        if (decision === 'changes_requested' && !comment.trim()) throw new StaffRuleError('COMMENT_REQUIRED')
        lesson.status = decision
        lesson.lastReview = { decision, comment: comment.trim(), reviewer: actor(), createdAt: stamp() }
        return lesson
      }),

    publishLesson: (id) =>
      later((state) => {
        const lesson = findLesson(state, id)
        if (lesson.status !== 'approved') throw new StaffRuleError('NOT_APPROVED')
        lesson.status = 'published'
        lesson.hasPublishedVersion = true
        lesson.updatedAt = stamp()
        const versions = (state.versions[id] ??= [])
        versions.push({ version: versions.length + 1, createdAt: stamp(), editedBy: actor(), note: 'Published', snapshot: clone(lesson) })
        return lesson
      }),

    versions: (lessonId) => later((state) => [...(state.versions[lessonId] ?? [])].reverse()),

    restoreVersion: (lessonId, version) =>
      later((state) => {
        const lesson = findLesson(state, lessonId)
        const saved = state.versions[lessonId]?.find((v) => v.version === version)
        if (!saved) throw new StaffRuleError('NOT_FOUND')
        Object.assign(lesson, clone(saved.snapshot), { order: lesson.order, hasPublishedVersion: true, lastReview: undefined })
        lesson.status = 'writing'
        lesson.updatedAt = stamp()
        lesson.updatedBy = actor()
        return lesson
      }),

    report: (filters) => later((state) => sampleReport(state, filters)),

    // The file is made after `later`, whose JSON copy would empty a Blob.
    exportReport: async (filters) => {
      const report = await later((state) => sampleReport(state, filters))
      return {
        blob: new Blob([reportCsv(report, filters)], { type: 'text/csv;charset=utf-8' }),
        filename: `intyoza-learning-report-${stamp().slice(0, 10)}.csv`,
      }
    },
  }
}
