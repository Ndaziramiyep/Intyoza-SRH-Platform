import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { pick, useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'
import { Icon } from '../../../components/Icon'
import { CourseQuiz } from './CourseQuiz'
import { LoadError, NotFound, PageSkeleton } from './ui'
import { useLearnQuery } from './useLearnQuery'

// The before quiz (/learn/courses/:slug/check): "what do you know already?", taken once when a
// course starts. Not graded: its answers are compared with the after quiz to measure learning.
// Skipping is always allowed.

export function BeforeQuizPage() {
  const { slug = '' } = useParams()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)
  const query = useLearnQuery(async () => {
    const course = await learnClient.course(slug)
    const lesson = course?.beforeQuiz ? await learnClient.lesson(course.beforeQuiz.lessonId, lang) : null
    return { course, lesson }
  }, [slug, lang])

  if (query.status === 'loading') {
    return (
      <div className="container py-10">
        <PageSkeleton label={t('common.loading')} rows={2} />
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

  const { course, lesson } = query.data
  if (!course) {
    return (
      <div className="container py-10">
        <NotFound text="courses.notFound" backTo="/learn" backLabel="learn.backToHub" />
      </div>
    )
  }

  const firstLesson = `/learn/courses/${course.slug}/lessons/${course.lessons[0]?.id}`
  const questions = (lesson?.questions ?? []).filter((q) => q.use === 'before' || q.use === 'both')
  // Nothing to ask (or already asked): straight to the lessons.
  if (!course.beforeQuiz || course.beforeQuiz.taken || questions.length === 0) return <Navigate to={firstLesson} replace />

  return (
    <div className="container max-w-[720px] py-8">
      <p className="mb-2 text-[0.85rem] font-semibold text-muted">{pick(course.title, lang)}</p>
      {!started ? (
        <section className="card flex flex-col items-start gap-4 p-8 max-sm:p-6" aria-labelledby="check-title">
          <span className="grid size-14 place-items-center rounded-[18px] bg-brand-soft text-brand" aria-hidden="true">
            <Icon name="help" size={28} />
          </span>
          <h1 id="check-title" className="m-0 font-display text-[clamp(1.4rem,4vw,1.9rem)] leading-tight">
            {t('quiz.beforeTitle')}
          </h1>
          <p className="m-0 max-w-[52ch] text-muted">{t('quiz.beforeText')}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => setStarted(true)}>
              {t('quiz.start')} <Icon name="arrowRight" size={16} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(firstLesson)}>
              {t('quiz.skip')}
            </button>
          </div>
        </section>
      ) : (
        <>
          <h1 className="sr-only">{t('quiz.beforeTitle')}</h1>
          <CourseQuiz lessonId={course.beforeQuiz.lessonId} questions={questions} kind="before" onSubmitted={() => navigate(firstLesson)} />
        </>
      )}
    </div>
  )
}
