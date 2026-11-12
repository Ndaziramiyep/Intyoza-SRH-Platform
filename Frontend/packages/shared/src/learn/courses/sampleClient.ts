import type { Lang } from '../../i18n/translations'
import type { KeyValueStore } from '../../storage'
import { LEARN_ITEMS } from '../content'
import type { Format, LearnItem, Localized, QuizQuestion } from '../types'
import type { LearnClient } from './client'
import { MEDIA_TYPES } from './helpers'
import { OUTLINE_NOTE, SAMPLE_CATEGORIES, SAMPLE_COURSES, STARTER_COURSES, type SampleCourse, type SampleLesson } from './sampleData'
import type {
  AgeGroup,
  Category,
  ContinueTarget,
  CourseDetail,
  CourseProgress,
  CourseResult,
  CourseSummary,
  Lesson,
  LessonSummary,
  LessonType,
  QuizUse,
} from './types'

// The Learning Hub on sample data, for building and testing the screens before the backend has the
// course endpoints. Progress is kept in `store` under the signed-in account's key, so two people
// sharing a phone don't see each other's progress. Answers are graded here, as the server will.

type Options = {
  store: KeyValueStore
  /** The signed-in account's id; progress is kept apart per account. */
  userKey: () => string
  /** The learner's registered age group, for "For you" and the starter course. */
  ageGroup: () => AgeGroup | undefined
  /** Simulated network delay, so loading states can be seen. */
  latencyMs?: number
  now?: () => Date
}

type Saved = {
  enrollments: Record<string, { startedAt: string; completedAt?: string; lastLessonId?: string; touchedAt: string }>
  lessons: Record<string, { doneAt: string; seconds: number }>
  attempts: { lessonId: string; kind: 'before' | 'after'; score: number; total: number; at: string }[]
  certificates: { code: string; courseId: string; issuedAt: string }[]
  followUps: Record<string, { dueAt: string; answer?: 'yes' | 'no' | 'skip' }>
}

/** A fresh record each time: the nested objects are changed in place, so they must never be shared. */
const empty = (): Saved => ({ enrollments: {}, lessons: {}, attempts: [], certificates: [], followUps: {} })

const FORMAT_TO_TYPE: Record<Format, LessonType> = {
  article: 'article',
  audio: 'audio',
  video: 'video',
  quiz: 'quiz',
  'myth-fact': 'myth_fact',
}

const FOLLOW_UP_DAYS = 7

/** One lesson of a sample course, resolved: the app's existing lesson, or an outline. */
export type IndexedLesson = {
  id: string
  courseId: string
  courseSlug: string
  order: number
  type: LessonType
  minutes: number
  title: Localized
  sizeMb?: number
  item?: LearnItem
  use: QuizUse
}

export type IndexedCourse = { def: SampleCourse; id: string; order: number; lessons: IndexedLesson[] }

function indexLesson(course: SampleCourse, lesson: SampleLesson, i: number): IndexedLesson {
  const base = { id: `${course.slug}--${i + 1}`, courseId: course.slug, courseSlug: course.slug, order: i + 1 }
  if ('from' in lesson) {
    const item = LEARN_ITEMS.find((it) => it.id === lesson.from)
    if (!item) throw new Error(`Sample course "${course.slug}" refers to a missing lesson "${lesson.from}"`)
    return {
      ...base,
      type: FORMAT_TO_TYPE[item.format],
      minutes: item.minutes,
      title: item.title,
      sizeMb: item.media?.sizeMb,
      item,
      use: lesson.use ?? 'after',
    }
  }
  return { ...base, type: lesson.outline, minutes: lesson.minutes, title: lesson.title, sizeMb: lesson.sizeMb, use: 'after' }
}

/** The sample courses with their lessons resolved, shared with the sample staff client. */
export const COURSES: IndexedCourse[] = SAMPLE_COURSES.map((def, order) => ({
  def,
  id: def.slug,
  order,
  lessons: def.lessons.map((lesson, i) => indexLesson(def, lesson, i)),
}))

const LESSONS = new Map(COURSES.flatMap((c) => c.lessons.map((l) => [l.id, l] as const)))

const categoryOrder = (id: string) => SAMPLE_CATEGORIES.findIndex((c) => c.id === id)

/** Article text split into short screens: one per paragraph or section (blank lines). */
export const toScreens = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)

/** The text in `lang` when it exists, otherwise English, with the language it is really in. */
function inLang(text: Localized, lang: Lang): { text: string; language: Lang } {
  const value = text[lang]
  return value ? { text: value, language: lang } : { text: text.en, language: 'en' }
}

/** The quiz lesson whose questions are asked before the course starts. */
const beforeQuizOf = (c: IndexedCourse) =>
  c.lessons.find((l) => l.type === 'quiz' && Boolean(l.item?.quiz?.length) && (l.use === 'before' || l.use === 'both'))

/** Quiz lessons whose questions count as the after quiz. */
const afterQuizzesOf = (c: IndexedCourse) =>
  c.lessons.filter((l) => l.type === 'quiz' && Boolean(l.item?.quiz?.length) && (l.use === 'after' || l.use === 'both'))

const questionId = (lessonId: string, i: number) => `${lessonId}-q${i + 1}`

/**
 * Where one of the app's original lessons (/learn/:id) now lives inside a course, so old links keep
 * working. The first course that uses it wins.
 */
export function courseLessonForItem(itemId: string): { slug: string; lessonId: string } | undefined {
  for (const c of COURSES) {
    const lesson = c.lessons.find((l) => l.item?.id === itemId)
    if (lesson) return { slug: c.def.slug, lessonId: lesson.id }
  }
  return undefined
}

export function createSampleLearnClient({ store, userKey, ageGroup, latencyMs = 180, now = () => new Date() }: Options): LearnClient {
  const key = () => `intyoza.learn.sample.${userKey()}`
  const load = (): Saved => ({ ...empty(), ...store.get<Saved>(key()) })
  const save = (s: Saved) => store.set(key(), s)
  const later = <T>(value: () => T) => new Promise<T>((resolve) => setTimeout(() => resolve(value()), latencyMs))
  const stamp = () => now().toISOString()

  function progressOf(c: IndexedCourse, s: Saved): CourseProgress | undefined {
    const enrollment = s.enrollments[c.id]
    if (!enrollment) return undefined
    const lessonsDone = c.lessons.filter((l) => s.lessons[l.id]).length
    const next = c.lessons.find((l) => !s.lessons[l.id])
    return {
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      lessonsDone,
      lessonsTotal: c.lessons.length,
      nextLessonId: next?.id ?? enrollment.lastLessonId,
    }
  }

  function summary(c: IndexedCourse, s: Saved): CourseSummary {
    return {
      id: c.id,
      slug: c.def.slug,
      categoryId: c.def.category,
      ageGroups: c.def.ageGroups,
      order: c.order,
      givesCertificate: Boolean(c.def.certificate),
      title: c.def.title,
      description: c.def.description,
      lessonCount: c.lessons.length,
      minutes: c.lessons.reduce((sum, l) => sum + l.minutes, 0),
      types: [...new Set(c.lessons.map((l) => l.type))],
      progress: progressOf(c, s),
    }
  }

  const lessonSummary = (l: IndexedLesson, s: Saved): LessonSummary => ({
    id: l.id,
    courseId: l.courseId,
    order: l.order,
    type: l.type,
    minutes: l.minutes,
    title: l.title,
    mediaSizeMb: MEDIA_TYPES.includes(l.type) ? l.sizeMb : undefined,
    done: Boolean(s.lessons[l.id]),
  })

  const sorted = (list: IndexedCourse[]) =>
    [...list].sort((a, b) => categoryOrder(a.def.category) - categoryOrder(b.def.category) || a.order - b.order)

  function touch(s: Saved, courseId: string, lessonId?: string) {
    const at = stamp()
    const current = s.enrollments[courseId]
    s.enrollments[courseId] = { ...current, startedAt: current?.startedAt ?? at, touchedAt: at, ...(lessonId ? { lastLessonId: lessonId } : {}) }
  }

  function completeIfFinished(s: Saved, c: IndexedCourse) {
    const enrollment = s.enrollments[c.id]
    if (!enrollment || enrollment.completedAt || !c.lessons.every((l) => s.lessons[l.id])) return
    const at = now()
    enrollment.completedAt = at.toISOString()
    if (c.def.certificate && !s.certificates.some((cert) => cert.courseId === c.id)) {
      s.certificates.push({ code: Math.random().toString(36).slice(2, 8).toUpperCase(), courseId: c.id, issuedAt: enrollment.completedAt })
    }
    s.followUps[c.id] ??= { dueAt: new Date(at.getTime() + FOLLOW_UP_DAYS * 86_400_000).toISOString() }
  }

  function lessonFor(l: IndexedLesson, lang: Lang, s: Saved): Lesson {
    const title = inLang(l.title, lang)
    const base = {
      id: l.id,
      courseId: l.courseId,
      courseSlug: l.courseSlug,
      order: l.order,
      type: l.type,
      minutes: l.minutes,
      title: title.text,
      askPrompt: l.item?.askPrompt,
      done: Boolean(s.lessons[l.id]),
    }
    const item = l.item
    const note = inLang(OUTLINE_NOTE, lang)
    // The lesson counts as translated only when its title and its text both are.
    const languageOf = (text: { language: Lang }) => (title.language === lang && text.language === lang ? lang : 'en')

    switch (l.type) {
      case 'article': {
        const body = item?.body ? inLang(item.body, lang) : note
        return { ...base, language: languageOf(body), screens: toScreens(body.text) }
      }
      case 'audio':
      case 'video': {
        const transcript = item?.media ? inLang(item.media.transcript, lang) : note
        return { ...base, language: languageOf(transcript), media: { url: item?.media?.src, sizeMb: l.sizeMb ?? 0, transcript: transcript.text } }
      }
      case 'myth_fact':
        // The app's myth or fact cards are written in English for now.
        return { ...base, language: 'en', cards: item?.cards ?? [] }
      case 'quiz':
        return {
          ...base,
          language: 'en',
          questions: (item?.quiz ?? []).map((q, i) => ({ id: questionId(l.id, i), question: q.question, options: q.options, use: l.use })),
        }
    }
  }

  return {
    categories: () =>
      later((): Category[] =>
        SAMPLE_CATEGORIES.map((c, order) => ({
          id: c.id,
          slug: c.id,
          icon: c.icon,
          tone: c.tone,
          order,
          name: c.name,
          description: c.description,
          courseCount: COURSES.filter((course) => course.def.category === c.id).length,
        })),
      ),

    courses: (filters = {}) =>
      later(() => {
        const s = load()
        return sorted(COURSES)
          .filter((c) => !filters.category || c.def.category === filters.category)
          .filter((c) => !filters.ageGroup || c.def.ageGroups.includes(filters.ageGroup))
          .map((c) => summary(c, s))
      }),

    forYou: () =>
      later(() => {
        const group = ageGroup()
        if (!group) return []
        const s = load()
        return sorted(COURSES.filter((c) => c.def.ageGroups.includes(group))).map((c) => summary(c, s))
      }),

    course: (slug) =>
      later((): CourseDetail | null => {
        const c = COURSES.find((course) => course.def.slug === slug)
        if (!c) return null
        const s = load()
        const before = beforeQuizOf(c)
        return {
          ...summary(c, s),
          whatYouLearn: c.def.whatYouLearn,
          reviewed: true,
          beforeQuiz: before && { lessonId: before.id, taken: s.attempts.some((a) => a.lessonId === before.id && a.kind === 'before') },
          lessons: c.lessons.map((l) => lessonSummary(l, s)),
        }
      }),

    lesson: (id, lang) =>
      later(() => {
        const l = LESSONS.get(id)
        if (!l) return null
        const s = load()
        touch(s, l.courseId, l.id)
        save(s)
        return lessonFor(l, lang, s)
      }),

    continue: () =>
      later((): ContinueTarget => {
        const s = load()
        const open = Object.entries(s.enrollments)
          .filter(([, e]) => !e.completedAt)
          .sort(([, a], [, b]) => b.touchedAt.localeCompare(a.touchedAt))
        for (const [courseId] of open) {
          const c = COURSES.find((course) => course.id === courseId)
          const progress = c && progressOf(c, s)
          if (c && progress?.nextLessonId) return { kind: 'resume', course: summary(c, s), lessonId: progress.nextLessonId }
        }
        const group = ageGroup()
        const starter = group && COURSES.find((c) => c.def.slug === STARTER_COURSES[group])
        if (starter && !s.enrollments[starter.id]) return { kind: 'starter', course: summary(starter, s) }
        return { kind: 'none' }
      }),

    startCourse: (slug) =>
      later(() => {
        const c = COURSES.find((course) => course.def.slug === slug)
        if (!c) return
        const s = load()
        touch(s, c.id)
        save(s)
      }),

    markLessonDone: (id, secondsSpent = 0) =>
      later(() => {
        const l = LESSONS.get(id)
        if (!l) return
        const s = load()
        const previous = s.lessons[id]
        s.lessons[id] = { doneAt: previous?.doneAt ?? stamp(), seconds: (previous?.seconds ?? 0) + secondsSpent }
        touch(s, l.courseId, id)
        completeIfFinished(s, COURSES.find((c) => c.id === l.courseId)!)
        save(s)
      }),

    submitQuiz: (id, kind, answers) =>
      later(() => {
        const l = LESSONS.get(id)
        const questions: QuizQuestion[] = l?.item?.quiz ?? []
        // Only the questions meant for this kind of quiz count (a lesson's questions share its use).
        const applies = l && (l.use === 'both' || l.use === kind)
        const results = (applies ? questions : []).map((q, i) => {
          const qid = questionId(id, i)
          const choice = answers.find((a) => a.questionId === qid)?.choice
          return { questionId: qid, correct: choice === q.answer, correctIndex: q.answer, explanation: q.explanation }
        })
        const score = results.filter((r) => r.correct).length
        const s = load()
        s.attempts.push({ lessonId: id, kind, score, total: results.length, at: stamp() })
        if (l && kind === 'after') {
          s.lessons[id] ??= { doneAt: stamp(), seconds: 0 }
          touch(s, l.courseId, id)
          completeIfFinished(s, COURSES.find((c) => c.id === l.courseId)!)
        }
        save(s)
        return { kind, score, total: results.length, results }
      }),

    courseResult: (slug) =>
      later((): CourseResult | null => {
        const c = COURSES.find((course) => course.def.slug === slug)
        if (!c) return null
        const s = load()
        const before = beforeQuizOf(c)
        const afterIds = afterQuizzesOf(c).map((l) => l.id)
        // The first before attempt (what the learner knew), and the latest after attempt.
        const firstBefore = before && s.attempts.find((a) => a.lessonId === before.id && a.kind === 'before')
        const lastAfter = s.attempts.filter((a) => a.kind === 'after' && afterIds.includes(a.lessonId)).at(-1)
        return {
          completed: Boolean(s.enrollments[c.id]?.completedAt),
          before: firstBefore && { score: firstBefore.score, total: firstBefore.total },
          after: lastAfter && { score: lastAfter.score, total: lastAfter.total },
          certificate: s.certificates.find((cert) => cert.courseId === c.id),
        }
      }),

    certificates: () => later(() => load().certificates),

    dueFollowUps: () =>
      later(() => {
        const s = load()
        const at = stamp()
        return Object.entries(s.followUps)
          .filter(([, f]) => !f.answer && f.dueAt <= at)
          .map(([courseId, f]) => ({ id: courseId, courseId, dueAt: f.dueAt }))
      }),

    answerFollowUp: (id, answer) =>
      later(() => {
        const s = load()
        const followUp = s.followUps[id]
        if (followUp) followUp.answer = answer
        save(s)
      }),
  }
}
