import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { LessonTypeLabel, LoadError, PageSkeleton } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { LANG_NAMES } from './editing'
import { StaffPageHeader } from './StaffLayout'
import { staffTable } from './styles'

/** Lessons still missing their Kinyarwanda or French text, Kinyarwanda first (it is required). */
export function StaffTranslationsPage() {
  const { t } = useLanguage()
  const query = useLearnQuery(() => staffClient.translationQueue(), [])
  const items = query.status === 'success' ? [...query.data].sort((a, b) => Number(b.missing.includes('rw')) - Number(a.missing.includes('rw'))) : []

  return (
    <>
      <StaffPageHeader title={t('staff.nav.translations')} intro={t('staff.translations.intro')} />
      {query.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={6} />}
      {query.status === 'error' && <LoadError onRetry={query.reload} />}
      {query.status === 'success' &&
        (items.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center text-muted">
            <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
              <Icon name="check" size={22} />
            </span>
            {t('staff.translations.empty')}
          </div>
        ) : (
          <div className={staffTable.wrap}>
            <table className={staffTable.table}>
              <thead>
                <tr>
                  <th scope="col" className={staffTable.th}>
                    {t('staff.col.lesson')}
                  </th>
                  <th scope="col" className={staffTable.th}>
                    {t('staff.col.course')}
                  </th>
                  <th scope="col" className={staffTable.th}>
                    {t('staff.translations.missing')}
                  </th>
                  <th scope="col" className={staffTable.th}>
                    <span className="sr-only">{t('staff.translations.open')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.lessonId} className={staffTable.tr}>
                    <td className={staffTable.td}>
                      <p className="m-0 font-semibold">{item.lessonTitle}</p>
                      <LessonTypeLabel type={item.type} className="text-[0.8rem] text-muted" />
                    </td>
                    <td className={`${staffTable.td} text-muted`}>{item.courseTitle}</td>
                    <td className={staffTable.td}>
                      <span className="flex flex-wrap gap-1.5">
                        {item.missing.map((lang) => (
                          <span key={lang} className={`tag ${lang === 'rw' ? 'bg-amber-soft text-amber' : ''}`} title={LANG_NAMES[lang]}>
                            {lang.toUpperCase()}
                            {lang === 'rw' ? ` · ${t('staff.required')}` : ''}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className={`${staffTable.td} text-right`}>
                      <Link to={`/admin/learn/lessons/${item.lessonId}`} className="btn btn-sm btn-outline">
                        {t('staff.translations.open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  )
}
