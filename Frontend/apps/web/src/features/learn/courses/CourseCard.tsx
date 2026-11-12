import { Link } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import { coursePercent, courseState } from '@intyoza/shared/learn/courses/helpers'
import type { Category, CourseSummary } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { pick, useLanguage } from '../../../i18n/context'
import { TONE_CLASSES } from './tones'
import { CourseMeta, ProgressBar } from './ui'

type Props = {
  course: CourseSummary
  category?: Category
  /** In low-data mode the cover picture is never loaded: the category icon stands in. */
  lowData: boolean
  /** On a phone, a compact row (small cover on the left) so a long list stays easy to scan. */
  compactOnPhone?: boolean
  className?: string
}

/**
 * One course in the Learning Hub: cover, category, title, one line, length and progress.
 * The whole card is one link to the course page.
 */
export function CourseCard({ course, category, lowData, compactOnPhone = false, className = '' }: Props) {
  const { t, lang } = useLanguage()
  const tone = TONE_CLASSES[category?.tone ?? 'brand']
  const state = courseState(course)
  const progress = course.progress
  const showCover = Boolean(course.cover) && !lowData
  const compact = compactOnPhone ? 'max-sm:flex-row' : ''
  const coverSize = compactOnPhone ? 'max-sm:h-auto max-sm:w-[88px] max-sm:shrink-0' : ''

  return (
    <Link
      to={`/learn/courses/${course.slug}`}
      className={`card lift group flex flex-col overflow-hidden p-0 text-fg no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${compact} ${className}`}
    >
      <div className={`relative grid h-28 place-items-center overflow-hidden ${tone.tile} ${coverSize}`} aria-hidden="true">
        {showCover ? (
          <img src={course.cover} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <>
            {/* Two soft rings behind the icon, so the tile reads as a cover and not an empty box. */}
            <span className="absolute -top-8 -right-6 size-32 rounded-full border-[14px] border-current opacity-[0.07]" />
            <span className="absolute -bottom-10 -left-8 size-28 rounded-full border-[12px] border-current opacity-[0.06]" />
            {category && <Icon name={category.icon} size={40} className="relative transition-transform group-hover:scale-105" />}
          </>
        )}
        {state === 'completed' && (
          <span
            className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[0.78rem] font-bold text-success shadow-sm ${
              compactOnPhone ? 'max-sm:hidden' : ''
            }`}
          >
            <Icon name="check" size={13} /> {t('courses.completed')}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col gap-1.5 p-4 ${compactOnPhone ? 'max-sm:min-w-0 max-sm:gap-1 max-sm:p-3.5' : ''}`}>
        {/* In the compact row the cover is too small for the badge, so "Completed" sits with the text. */}
        {compactOnPhone && state === 'completed' && (
          <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-success sm:hidden">
            <Icon name="check" size={13} /> {t('courses.completed')}
          </span>
        )}
        {category && <p className={`m-0 text-[0.75rem] font-bold tracking-[0.06em] uppercase ${tone.text}`}>{pick(category.name, lang)}</p>}
        <h3 className="m-0 text-[1.08rem] leading-snug">{pick(course.title, lang)}</h3>
        {/* The wrapper takes the spare height; the text itself stays clamped to two lines. */}
        <div className="flex-1">
          <p className={`m-0 line-clamp-2 text-[0.9rem] text-muted ${compactOnPhone ? 'max-sm:hidden' : ''}`}>{pick(course.description, lang)}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <CourseMeta lessons={course.lessonCount} minutes={course.minutes} />
          {course.givesCertificate && state !== 'completed' && (
            <span className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-muted">
              <Icon name="flag" size={13} /> {t('hub.certificate')}
            </span>
          )}
        </div>

        {state === 'in_progress' && progress && (
          <div className="mt-1.5 flex items-center gap-2.5 text-[0.82rem] font-semibold text-brand">
            <ProgressBar
              value={coursePercent(course)}
              label={fill(t('courses.progress'), { done: progress.lessonsDone, total: progress.lessonsTotal })}
              className="h-1.5 flex-1"
            />
            <span aria-hidden="true">{fill(t('hub.progressShort'), { done: progress.lessonsDone, total: progress.lessonsTotal })}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
