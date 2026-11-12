import { useState, type ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DISTRICTS, GENDER_OPTIONS } from '@intyoza/shared/chat/about'
import type { Gender } from '@intyoza/shared/chat/types'
import { fill } from '@intyoza/shared/i18n/translations'
import { AGE_GROUPS, ageGroupLabel } from '@intyoza/shared/learn/courses/helpers'
import type { LearningReport, ReportFilters } from '@intyoza/shared/learn/courses/staffTypes'
import type { AgeGroup } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { LoadError, PageSkeleton } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { StaffPageHeader } from './StaffLayout'
import { staffTable } from './styles'

// Reports: how many young people the Learning Hub reached, how many finished, what they learned
// (after-quiz minus before-quiz score), and whether they went on to a health service. Totals only,
// never one learner's answers. The filters live in the address, so a report can be linked.

const FILTER_KEYS: (keyof ReportFilters)[] = ['category', 'course', 'from', 'to', 'ageGroup', 'district', 'gender']
const percent = (ratio: number) => `${Math.round(ratio * 100)}%`
const number = new Intl.NumberFormat('en-GB')

export function StaffReportsPage() {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const filters: ReportFilters = Object.fromEntries(FILTER_KEYS.flatMap((k) => (params.get(k) ? [[k, params.get(k)]] : [])))
  const key = JSON.stringify(filters)
  const options = useLearnQuery(() => Promise.all([staffClient.categories(), staffClient.courses()]), [])
  const report = useLearnQuery(() => staffClient.report(filters), [key])
  const [exporting, setExporting] = useState(false)
  const [exportFailed, setExportFailed] = useState(false)

  const set = (name: keyof ReportFilters, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(name, value)
        else next.delete(name)
        // A course belongs to a category: changing the category clears the course.
        if (name === 'category') next.delete('course')
        return next
      },
      { replace: true },
    )

  const download = async () => {
    setExporting(true)
    setExportFailed(false)
    try {
      const { blob, filename } = await staffClient.exportReport(filters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportFailed(true)
    } finally {
      setExporting(false)
    }
  }

  const [categories, courses] = options.status === 'success' ? options.data : [[], []]
  const courseOptions = courses.filter((c) => !filters.category || c.categoryId === filters.category)
  const select = 'select min-h-10 py-1.5 text-[0.9rem]'

  return (
    <>
      <StaffPageHeader
        title={t('staff.nav.reports')}
        intro={t('staff.reports.intro')}
        actions={
          <button type="button" className="btn btn-outline" onClick={download} disabled={exporting || report.status !== 'success'} aria-busy={exporting}>
            <Icon name="arrowRight" size={16} className="rotate-90" /> {t('staff.reports.export')}
          </button>
        }
      />
      {exportFailed && (
        <p className="notice notice-warn mb-4" role="alert">
          <Icon name="alert" size={18} /> {t('staff.reports.exportError')}
        </p>
      )}

      {/* Filters: one row above every result. */}
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4" aria-label={t('staff.reports.filters')} onSubmit={(e) => e.preventDefault()}>
        <FilterField label={t('staff.col.category')}>
          <select className={select} value={filters.category ?? ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">{t('staff.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.en}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t('staff.col.course')}>
          <select className={`${select} max-w-60`} value={filters.course ?? ''} onChange={(e) => set('course', e.target.value)}>
            <option value="">{t('staff.reports.allCourses')}</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title.en}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t('staff.reports.from')}>
          <input type="date" className={select} value={filters.from ?? ''} max={filters.to} onChange={(e) => set('from', e.target.value)} />
        </FilterField>
        <FilterField label={t('staff.reports.to')}>
          <input type="date" className={select} value={filters.to ?? ''} min={filters.from} onChange={(e) => set('to', e.target.value)} />
        </FilterField>
        <FilterField label={t('staff.col.ages')}>
          <select className={select} value={filters.ageGroup ?? ''} onChange={(e) => set('ageGroup', e.target.value as AgeGroup)}>
            <option value="">{t('common.all')}</option>
            {AGE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {ageGroupLabel(g)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t('staff.reports.district')}>
          <select className={select} value={filters.district ?? ''} onChange={(e) => set('district', e.target.value)}>
            <option value="">{t('common.all')}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t('staff.reports.gender')}>
          <select className={select} value={filters.gender ?? ''} onChange={(e) => set('gender', e.target.value as Gender)}>
            <option value="">{t('common.all')}</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {t(g.label)}
              </option>
            ))}
          </select>
        </FilterField>
        {Object.keys(filters).length > 0 && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setParams({}, { replace: true })}>
            {t('hub.clearFilters')}
          </button>
        )}
      </form>

      {report.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={4} />}
      {report.status === 'error' && <LoadError onRetry={report.reload} />}
      {report.status === 'success' && <ReportView report={report.data} courseChosen={Boolean(filters.course)} />}

      <p className="mt-6 mb-0 flex items-start gap-2 text-[0.85rem] text-muted">
        <Icon name="lock" size={16} className="mt-0.5 shrink-0" /> {t('staff.reports.privacy')}
      </p>
    </>
  )
}

function FilterField({ label, children }: { label: string; children: ReactElement }) {
  return (
    <label className="flex flex-col gap-1 text-[0.78rem] font-semibold text-muted">
      {label}
      {children}
    </label>
  )
}

function ReportView({ report, courseChosen }: { report: LearningReport; courseChosen: boolean }) {
  const { t } = useLanguage()
  const tiles = [
    { label: t('staff.reports.reach'), value: number.format(report.reach), note: t('staff.reports.reachNote') },
    { label: t('staff.reports.completion'), value: percent(report.completionRate), note: t('staff.reports.completionNote') },
    { label: t('staff.reports.gain'), value: `+${Math.round(report.knowledgeGain)}`, unit: t('staff.reports.points'), note: t('staff.reports.gainNote') },
    { label: t('staff.reports.action'), value: percent(report.actionTaken), note: t('staff.reports.actionNote') },
    { label: t('staff.reports.certificates'), value: number.format(report.certificates), note: t('staff.reports.certificatesNote') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 p-0" aria-label={t('staff.reports.summary')}>
        {tiles.map((tile) => (
          <li key={tile.label} className="card flex flex-col gap-1 p-4">
            <span className="text-[0.82rem] font-semibold text-muted">{tile.label}</span>
            <span className="font-display text-[2rem] leading-none font-bold tabular-nums">
              {tile.value}
              {tile.unit && <span className="ml-1 text-[0.9rem] font-semibold text-muted">{tile.unit}</span>}
            </span>
            <span className="text-[0.78rem] text-muted">{tile.note}</span>
          </li>
        ))}
      </ul>

      <DropOff data={report.dropOff} title={courseChosen ? t('staff.reports.dropOffCourse') : t('staff.reports.dropOffAll')} />

      <section aria-labelledby="report-courses">
        <h2 id="report-courses" className="mt-0 mb-3 text-[1.1rem]">
          {t('staff.reports.byCourse')}
        </h2>
        <div className={staffTable.wrap}>
          <table className={staffTable.table}>
            <thead>
              <tr>
                <th scope="col" className={staffTable.th}>
                  {t('staff.col.course')}
                </th>
                <th scope="col" className={`${staffTable.th} text-right`}>
                  {t('staff.reports.started')}
                </th>
                <th scope="col" className={`${staffTable.th} text-right`}>
                  {t('staff.reports.completed')}
                </th>
                <th scope="col" className={`${staffTable.th} text-right`}>
                  {t('staff.reports.completion')}
                </th>
                <th scope="col" className={`${staffTable.th} text-right`}>
                  {t('staff.reports.gain')}
                </th>
              </tr>
            </thead>
            <tbody>
              {report.byCourse.map((c) => (
                <tr key={c.courseId} className={staffTable.tr}>
                  <th scope="row" className={`${staffTable.td} text-left font-semibold`}>
                    {c.title}
                  </th>
                  <td className={`${staffTable.td} text-right tabular-nums`}>{number.format(c.started)}</td>
                  <td className={`${staffTable.td} text-right tabular-nums`}>{number.format(c.completed)}</td>
                  <td className={`${staffTable.td} text-right tabular-nums`}>{c.started ? percent(c.completed / c.started) : '—'}</td>
                  <td className={`${staffTable.td} text-right tabular-nums`}>+{c.gain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/**
 * Where learners stop: one bar per lesson, a single hue (magnitude), the value in text colour at
 * the end of each bar, a tooltip on hover or keyboard focus, and the same numbers as a table.
 */
function DropOff({ data, title }: { data: LearningReport['dropOff']; title: string }) {
  const { t } = useLanguage()
  const [asTable, setAsTable] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.stopped))
  const total = data.reduce((sum, d) => sum + d.stopped, 0)

  return (
    <section aria-labelledby="report-dropoff" className="card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 id="report-dropoff" className="m-0 text-[1.1rem]">
            {title}
          </h2>
          <p className="m-0 text-[0.85rem] text-muted">{t('staff.reports.dropOffNote')}</p>
        </div>
        <div className="chip-row" role="group" aria-label={t('staff.reports.view')}>
          <button type="button" className="chip min-h-8 px-3 py-1 text-[0.82rem]" aria-pressed={!asTable} onClick={() => setAsTable(false)}>
            {t('staff.reports.chart')}
          </button>
          <button type="button" className="chip min-h-8 px-3 py-1 text-[0.82rem]" aria-pressed={asTable} onClick={() => setAsTable(true)}>
            {t('staff.reports.table')}
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="m-0 text-muted">{t('staff.reports.noData')}</p>
      ) : asTable ? (
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr>
              <th scope="col" className="border-b border-line py-2 text-left text-[0.78rem] font-bold text-muted uppercase">
                {t('staff.col.lesson')}
              </th>
              <th scope="col" className="border-b border-line py-2 text-right text-[0.78rem] font-bold text-muted uppercase">
                {t('staff.reports.stopped')}
              </th>
              <th scope="col" className="border-b border-line py-2 text-right text-[0.78rem] font-bold text-muted uppercase">
                {t('staff.reports.share')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row" className="border-b border-line py-2 text-left font-normal">
                  {d.label}
                </th>
                <td className="border-b border-line py-2 text-right tabular-nums">{number.format(d.stopped)}</td>
                <td className="border-b border-line py-2 text-right tabular-nums">{total ? percent(d.stopped / total) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {data.map((d, i) => {
            const tip = fill(t('staff.reports.tooltip'), { n: number.format(d.stopped), share: total ? percent(d.stopped / total) : '0%' })
            return (
              <li
                key={d.label}
                tabIndex={0}
                aria-label={`${d.label}: ${tip}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="relative grid grid-cols-[minmax(0,220px)_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus max-sm:grid-cols-[1fr_auto] max-sm:gap-y-1"
              >
                <span className="truncate text-[0.88rem] max-sm:col-span-2" title={d.label}>
                  {d.label}
                </span>
                <span className="h-3 overflow-hidden rounded-r-[4px] bg-surface-2" aria-hidden="true">
                  <span className="block h-full rounded-r-[4px] bg-chart" style={{ width: `${(d.stopped / max) * 100}%` }} />
                </span>
                <span className="text-[0.88rem] font-semibold tabular-nums">{number.format(d.stopped)}</span>
                {active === i && (
                  <span role="tooltip" className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-[0.78rem] whitespace-nowrap text-bg shadow-lg">
                    {tip}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
