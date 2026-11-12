import { Link } from 'react-router-dom'
import { fill, type TKey } from '@intyoza/shared/i18n/translations'
import { ageGroupLabel } from '@intyoza/shared/learn/courses/helpers'
import type { AgeGroup, Category, ContentStatus, LessonType } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { useLanguage } from '../../../i18n/context'
import { LESSON_TYPES, STATUS_CLASSES, TONE_CLASSES } from './tones'

// Small building blocks shared by the Learning Hub screens (hub, course page, lesson player, staff).

/** A labelled progress bar. `value` is 0 to 100. */
export function ProgressBar({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <span className="grow-x block h-full rounded-[inherit] bg-brand" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** "Checked by a health worker", on every course and lesson. */
export function CheckedBadge({ className = '' }: { className?: string }) {
  const { t } = useLanguage()
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-success ${className}`}>
      <Icon name="shield" size={16} /> {t('courses.checked')}
    </span>
  )
}

/** A category's icon on its tone tile. */
export function CategoryIcon({ category, size = 40 }: { category: Pick<Category, 'icon' | 'tone'>; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl ${TONE_CLASSES[category.tone].tile}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name={category.icon} size={Math.round(size * 0.5)} />
    </span>
  )
}

/** "5 lessons · 20 min" */
export function CourseMeta({ lessons, minutes, className = '' }: { lessons: number; minutes: number; className?: string }) {
  const { t } = useLanguage()
  return (
    <span className={`text-[0.88rem] text-muted ${className}`}>
      {fill(t('courses.lessons'), { n: lessons })} · {fill(t('courses.minutes'), { n: minutes })}
    </span>
  )
}

/** "Ages 15–19 · 20–24" */
export function AgeGroups({ groups }: { groups: AgeGroup[] }) {
  const { t } = useLanguage()
  return <>{fill(t('courses.ages'), { ages: groups.map(ageGroupLabel).join(' · ') })}</>
}

/** A lesson type with its icon: "▶ Video". */
export function LessonTypeLabel({ type, className = '' }: { type: LessonType; className?: string }) {
  const { t } = useLanguage()
  const { icon, label } = LESSON_TYPES[type]
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon name={icon} size={14} /> {t(label)}
    </span>
  )
}

/** Where a piece of content is in the review workflow (staff screens). */
export function StatusBadge({ status }: { status: ContentStatus }) {
  const { t } = useLanguage()
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}>
      {t(`staff.status.${status}`)}
    </span>
  )
}

/** Placeholder blocks while a page loads. Hidden from screen readers, which hear `label` instead. */
export function PageSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="animate-pulse">
      <div aria-hidden="true">
        <div className="mb-3 h-4 w-32 rounded bg-surface-2" />
        <div className="mb-6 h-8 w-3/4 max-w-[520px] rounded-lg bg-surface-2" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="mb-3 h-16 rounded-[14px] bg-surface-2" />
        ))}
      </div>
    </div>
  )
}

/** A failed load, with a retry button. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="card flex flex-col items-center gap-4 px-5 py-10 text-center" role="alert">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon name="wifiOff" size={22} />
      </span>
      <p className="m-0 max-w-[42ch] text-muted">{t('courses.loadError')}</p>
      <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
        <Icon name="refresh" size={16} /> {t('courses.retry')}
      </button>
    </div>
  )
}

/** Nothing at this address, with a way back. */
export function NotFound({ text, backTo, backLabel }: { text: TKey; backTo: string; backLabel: TKey }) {
  const { t } = useLanguage()
  return (
    <div className="card flex flex-col items-center gap-4 px-5 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon name="search" size={22} />
      </span>
      <p className="m-0 max-w-[42ch] text-muted">{t(text)}</p>
      <Link to={backTo} className="btn btn-outline btn-sm">
        <Icon name="arrowLeft" size={16} /> {t(backLabel)}
      </Link>
    </div>
  )
}
