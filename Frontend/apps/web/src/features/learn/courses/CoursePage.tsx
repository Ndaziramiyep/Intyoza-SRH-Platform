import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import { coursePercent, courseState } from '@intyoza/shared/learn/courses/helpers'
import type { CourseDetail } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { pick, useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'
import { LessonList } from './LessonList'
import { TONE_CLASSES } from './tones'
import { AgeGroups, CategoryIcon, CheckedBadge, CourseMeta, LoadError, NotFound, PageSkeleton, ProgressBar } from './ui'
import { useLearnQuery } from './useLearnQuery'

// The course page: what a course covers, before starting it. One main action (Start, Continue or
// Review), shown under the header so it is visible without scrolling, and again after the contents.
// Starting a course that has a before quiz goes to that quiz first.
// Privacy: the browser tab title is never set to a course name.

export function CoursePage() {
  const { slug = '' } = useParams()
  const { t, lang } = useLanguage()
  const query = useLearnQuery(() => Promise.all([learnClient.course(slug), learnClient.categories()]), [slug])

  if (query.status === 'loading') {
    return (
      <div className="container py-10">
        <PageSkeleton label={t('common.loading')} rows={4} />
      </div>
    )
  }
  if (query.status === 'error') {
    return (
      <div className="container py-10">
        <LoadError onRetry={query.reload} />
      </div>
    )
  }

  const [course, categories] = query.data
  if (!course) {
    return (
      <div className="container py-10">
        <NotFound text="courses.notFound" backTo="/learn" backLabel="learn.backToHub" />
      </div>
    )
  }

  const category = categories.find((c) => c.id === course.categoryId)
  const progress = course.progress

  return (
    <div className="container max-w-[860px] pb-6">
      <Link to="/learn" className="back-link mt-8 items-center gap-1.5 text-[0.92rem] font-semibold text-muted no-underline hover:text-brand">
        <Icon name="arrowLeft" size={16} /> {t('learn.backToHub')}
      </Link>

      <header className="pb-6">
        {category && (
          <p className={`mb-3 flex items-center gap-2.5 text-[0.85rem] font-bold tracking-[0.06em] uppercase ${TONE_CLASSES[category.tone].text}`}>
            <CategoryIcon category={category} size={32} />
            {pick(category.name, lang)}
          </p>
        )}
        <h1 className="m-0 font-display text-[clamp(1.6rem,4.4vw,2.3rem)] leading-tight">{pick(course.title, lang)}</h1>
        <p className="mt-2 mb-4 max-w-[60ch] text-[1.05rem] text-muted">{pick(course.description, lang)}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.9rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={16} /> <CourseMeta lessons={course.lessonCount} minutes={course.minutes} />
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="users" size={16} /> <AgeGroups groups={course.ageGroups} />
          </span>
          {course.reviewed && <CheckedBadge />}
        </div>

        {progress && (
          <div className="mt-5 flex max-w-[420px] items-center gap-3 text-[0.88rem] font-semibold">
            <ProgressBar
              value={coursePercent(course)}
              label={fill(t('courses.progress'), { done: progress.lessonsDone, total: progress.lessonsTotal })}
              className="flex-1"
            />
            {fill(t('courses.progress'), { done: progress.lessonsDone, total: progress.lessonsTotal })}
          </div>
        )}

        <div className="mt-6">
          <StartButton course={course} />
        </div>
      </header>

      {course.whatYouLearn.length > 0 && (
        <section aria-labelledby="course-learn" className="card mb-6 bg-surface-2">
          <h2 id="course-learn" className="mt-0 mb-3 text-[1.1rem]">
            {t('courses.whatYouLearn')}
          </h2>
          <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
            {course.whatYouLearn.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success" aria-hidden="true">
                  <Icon name="check" size={12} />
                </span>
                {pick(point, lang)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="course-contents" className="card p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line px-5 py-4">
          <h2 id="course-contents" className="m-0 text-[1.1rem]">
            {t('courses.contents')}
          </h2>
          <CourseMeta lessons={course.lessonCount} minutes={course.minutes} />
        </div>
        <LessonList courseSlug={course.slug} lessons={course.lessons} isDone={(l) => l.done} currentId={courseState(course) === 'in_progress' ? progress?.nextLessonId : undefined} />
      </section>

      {course.givesCertificate && (
        <p className="mt-4 mb-0 flex items-center gap-2 text-[0.92rem] text-muted">
          <Icon name="flag" size={16} /> {t('courses.certificate')}
        </p>
      )}

      <div className="mt-6">
        <StartButton course={course} />
      </div>
    </div>
  )
}

/** Start (through the before quiz when there is one), Continue, or Review. */
function StartButton({ course }: { course: CourseDetail }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const state = courseState(course)
  const next = course.lessons.find((l) => l.id === course.progress?.nextLessonId) ?? course.lessons[0]
  const label = state === 'completed' ? t('courses.review') : state === 'in_progress' ? t('courses.continue') : t('courses.start')

  const begin = async () => {
    if (!next) return
    setBusy(true)
    try {
      if (state === 'not_started') await learnClient.startCourse(course.slug)
      const askFirst = state === 'not_started' && course.beforeQuiz && !course.beforeQuiz.taken
      navigate(askFirst ? `/learn/courses/${course.slug}/check` : `/learn/courses/${course.slug}/lessons/${state === 'completed' ? course.lessons[0].id : next.id}`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn btn-primary max-sm:w-full" onClick={begin} disabled={!next || busy} aria-busy={busy}>
      {label} <Icon name="arrowRight" size={16} />
    </button>
  )
}
