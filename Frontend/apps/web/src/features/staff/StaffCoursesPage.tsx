import { Link, useSearchParams } from 'react-router-dom'
import { ageGroupLabel } from '@intyoza/shared/learn/courses/helpers'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { CourseMeta, LoadError, PageSkeleton, StatusBadge } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { StaffPageHeader } from './StaffLayout'
import { staffTable } from './styles'

/** Every course with its status in the review workflow. Read-only on Day 1; the editor comes on Day 5. */
export function StaffCoursesPage() {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const query = useLearnQuery(() => staffClient.courses({ category: category || undefined }), [category])
  // Loaded once, so the filter keeps its options while the list reloads.
  const categories = useLearnQuery(() => staffClient.categories(), [])
  const categoryName = (id: string) => categories.data?.find((c) => c.id === id)?.name.en

  const filter = (
    <div className="flex flex-wrap items-end gap-3">
      <div>
      <label htmlFor="staff-course-category" className="label">
        {t('staff.col.category')}
      </label>
      <select
        id="staff-course-category"
        className="select min-w-[220px]"
        value={category}
        onChange={(e) => setParams(e.target.value ? { category: e.target.value } : {}, { replace: true })}
      >
        <option value="">{t('staff.allCategories')}</option>
        {categories.data?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name.en}
          </option>
        ))}
      </select>
      </div>
      <Link to="/admin/learn/courses/new" className="btn btn-primary">
        <Icon name="plus" size={16} /> {t('staff.courses.add')}
      </Link>
    </div>
  )

  return (
    <>
      <StaffPageHeader title={t('staff.nav.courses')} intro={t('staff.courses.intro')} actions={filter} />
      {query.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={6} />}
      {query.status === 'error' && <LoadError onRetry={query.reload} />}
      {query.status === 'success' && (
        <div className={staffTable.wrap}>
          <table className={staffTable.table}>
            <thead>
              <tr>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.course')}
                </th>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.category')}
                </th>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.lessons')}
                </th>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.ages')}
                </th>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.languages')}
                </th>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((course) => (
                <tr key={course.id} className={staffTable.tr}>
                  <td className={staffTable.td}>
                    <Link to={`/admin/learn/courses/${course.id}`} className="font-semibold text-fg no-underline hover:text-brand hover:underline">
                      {course.title.en}
                    </Link>
                    <p className="m-0 font-mono text-[0.78rem] text-muted">{course.slug}</p>
                  </td>
                  <td className={`${staffTable.td} text-muted`}>{categoryName(course.categoryId)}</td>
                  <td className={staffTable.td}>
                    <CourseMeta lessons={course.lessonCount} minutes={course.minutes} className="whitespace-nowrap" />
                  </td>
                  <td className={`${staffTable.td} whitespace-nowrap text-muted`}>{course.ageGroups.map(ageGroupLabel).join(', ')}</td>
                  <td className={staffTable.td}>
                    <span className="flex gap-1">
                      {course.languages.map((lang) => (
                        <span key={lang} className="tag uppercase">
                          {lang}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className={staffTable.td}>
                    <StatusBadge status={course.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
