import { Link, useParams } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import { courseState } from '@intyoza/shared/learn/courses/helpers'
import type { CourseSummary, QuizScore } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { pick, useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'
import { Confetti } from '../../myths/Confetti'
import { CertificateCard } from './CertificateCard'
import { CourseCard } from './CourseCard'
import { LessonList } from './LessonList'
import { LoadError, NotFound, PageSkeleton } from './ui'
import { useLearnQuery } from './useLearnQuery'
import { useLowData } from './useLowData'

// The end of a course (/learn/courses/:slug/complete): a short celebration, the before and after
// quiz scores (what the learner gained), the certificate when the course gives one, and one course
// to take next. Shown only once every lesson is done; otherwise the lessons still to do.

export function CourseCompletePage() {
  const { slug = '' } = useParams()
  const { t, lang } = useLanguage()
  const [lowData] = useLowData()
  const query = useLearnQuery(
    () => Promise.all([learnClient.course(slug), learnClient.courseResult(slug), learnClient.courses(), learnClient.categories()]),
    [slug],
  )

  if (query.status === 'loading') {
    return (
      <div className="container py-10">
        <PageSkeleton label={t('common.loading')} rows={3} />
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

  const [course, result, courses, categories] = query.data
  if (!course || !result) {
    return (
      <div className="container py-10">
        <NotFound text="courses.notFound" backTo="/learn" backLabel="learn.backToHub" />
      </div>
    )
  }

  const title = pick(course.title, lang)

  if (!result.completed) {
    const remaining = course.lessons.filter((l) => !l.done)
    return (
      <div className="container max-w-[760px] py-10">
        <p className="mb-2 text-[0.85rem] font-semibold text-muted">{title}</p>
        <h1 className="mt-0 mb-4 font-display text-[clamp(1.4rem,4vw,1.9rem)]">{t('complete.notYet')}</h1>
        <div className="card p-0">
          <LessonList courseSlug={course.slug} lessons={remaining} isDone={() => false} />
        </div>
      </div>
    )
  }

  const next = suggestNext(course, courses)

  return (
    <div className="container max-w-[820px] py-10">
      <Confetti />
      <header className="mb-8 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-success-soft text-success" aria-hidden="true">
          <Icon name="check" size={30} />
        </span>
        <p className="mb-1 text-[0.85rem] font-semibold text-muted">{title}</p>
        <h1 className="m-0 font-display text-[clamp(1.7rem,5vw,2.4rem)] leading-tight">{t('complete.title')}</h1>
        <p className="mx-auto mt-2 mb-0 max-w-[50ch] text-muted">{t('complete.text')}</p>
      </header>

      <div className="flex flex-col gap-8">
        {result.after && <ScoreCompare before={result.before} after={result.after} />}
        {result.certificate && <CertificateCard certificate={result.certificate} courseTitle={title} />}

        {next && (
          <section aria-labelledby="complete-next">
            <h2 id="complete-next" className="mt-0 mb-3 text-[1.1rem]">
              {t('complete.upNext')}
            </h2>
            <div className="max-w-[360px]">
              <CourseCard course={next} category={categories.find((c) => c.id === next.categoryId)} lowData={lowData} />
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link to="/learn" className="btn btn-primary">
            {t('learn.backToHub')} <Icon name="arrowRight" size={16} />
          </Link>
          <Link to={`/learn/courses/${course.slug}`} className="btn btn-ghost">
            {t('courses.review')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** A course not started yet: from the same category first, then any other. */
function suggestNext(course: CourseSummary, courses: CourseSummary[]) {
  const fresh = courses.filter((c) => c.id !== course.id && courseState(c) === 'not_started')
  return fresh.find((c) => c.categoryId === course.categoryId) ?? fresh[0]
}

/** Before and after quiz scores side by side, with the gain. */
function ScoreCompare({ before, after }: { before?: QuizScore; after: QuizScore }) {
  const { t } = useLanguage()
  const gain = before ? after.score - before.score : 0
  const bar = (score: QuizScore, tone: string) => (
    <div className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <span className={`grow-x block h-full rounded-[inherit] ${tone}`} style={{ width: `${score.total ? (score.score / score.total) * 100 : 0}%` }} />
    </div>
  )

  return (
    <section aria-labelledby="complete-score" className="card flex flex-col gap-4 p-6">
      <h2 id="complete-score" className="m-0 text-[1.1rem]">
        {t('complete.scoreTitle')}
      </h2>
      <dl className="m-0 grid gap-4 sm:grid-cols-2">
        {before && (
          <div>
            <dt className="mb-1 flex justify-between text-[0.9rem] text-muted">
              {t('complete.before')} <span className="font-semibold tabular-nums">{before.score}/{before.total}</span>
            </dt>
            <dd className="m-0">{bar(before, 'bg-muted/50')}</dd>
          </div>
        )}
        <div>
          <dt className="mb-1 flex justify-between text-[0.9rem] text-muted">
            {t('complete.after')} <span className="font-semibold text-fg tabular-nums">{after.score}/{after.total}</span>
          </dt>
          <dd className="m-0">{bar(after, 'bg-brand')}</dd>
        </div>
      </dl>
      {gain > 0 && (
        <p className="m-0 inline-flex items-center gap-1.5 font-semibold text-success">
          <Icon name="spark" size={16} /> {fill(t('complete.gain'), { n: gain })}
        </p>
      )}
    </section>
  )
}
