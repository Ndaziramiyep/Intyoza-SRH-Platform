import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { LessonTypeLabel, LoadError, PageSkeleton } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { StaffPageHeader } from './StaffLayout'

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Lessons waiting for health review. Reviewers see content only, never learners. */
export function StaffReviewsPage() {
  const { t } = useLanguage()
  const query = useLearnQuery(() => staffClient.reviews(), [])

  return (
    <>
      <StaffPageHeader title={t('staff.nav.reviews')} intro={t('staff.reviews.intro')} />
      {query.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={4} />}
      {query.status === 'error' && <LoadError onRetry={query.reload} />}
      {query.status === 'success' &&
        (query.data.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center text-muted">
            <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
              <Icon name="check" size={22} />
            </span>
            {t('staff.reviews.empty')}
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {query.data.map((item) => (
              <li key={item.lessonId} className="card flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
                <div className="min-w-0 flex-1 basis-[min(100%,280px)]">
                  <Link to={`/admin/reviews/${item.lessonId}`} className="font-semibold text-fg no-underline hover:text-brand hover:underline">
                    {item.lessonTitle}
                  </Link>
                  <p className="m-0 text-[0.88rem] text-muted">{item.courseTitle}</p>
                </div>
                <LessonTypeLabel type={item.type} className="text-[0.88rem] text-muted" />
                {item.isEdit && <span className="tag bg-amber-soft text-amber">{t('staff.edit')}</span>}
                <span className="text-[0.85rem] text-muted">
                  {t('staff.col.submitted')} {dateFormat.format(new Date(item.submittedAt))}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </>
  )
}
