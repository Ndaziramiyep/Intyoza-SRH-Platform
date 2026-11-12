import { Link } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import type { LessonSummary } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { pick, useLanguage } from '../../../i18n/context'
import { LessonTypeLabel } from './ui'

type Props = {
  courseSlug: string
  lessons: LessonSummary[]
  /** Whether a lesson is done, including progress saved a moment ago and not yet reloaded. */
  isDone: (lesson: LessonSummary) => boolean
  /** The lesson being played, highlighted. */
  currentId?: string
  /** Called after a lesson is chosen (closes the phone sheet). */
  onNavigate?: () => void
  /** "comfortable" on the course page, "compact" in the player's sidebar. */
  density?: 'comfortable' | 'compact'
}

/** The lessons of a course in order, each with its type and time, a check when done. */
export function LessonList({ courseSlug, lessons, isDone, currentId, onNavigate, density = 'comfortable' }: Props) {
  const { t, lang } = useLanguage()
  const compact = density === 'compact'

  return (
    <ol className="m-0 list-none p-0">
      {lessons.map((lesson) => {
        const done = isDone(lesson)
        const current = lesson.id === currentId
        return (
          <li key={lesson.id} className={compact ? '' : 'border-b border-line last:border-b-0'}>
            <Link
              to={`/learn/courses/${courseSlug}/lessons/${lesson.id}`}
              onClick={onNavigate}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-3 text-fg no-underline ${
                compact ? 'min-h-12 rounded-[10px] px-2.5 py-2' : 'min-h-14 px-5 py-3'
              } ${current ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-[0.8rem] font-bold ${
                  done ? 'bg-success-soft text-success' : current ? 'bg-brand text-on-brand' : 'border border-line text-muted'
                }`}
              >
                {done ? <Icon name="check" size={14} /> : lesson.order}
              </span>
              {/* Spoken after the title: "Done" or "Current lesson". */}
              <span className="flex min-w-0 flex-1 items-center gap-3 max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-0.5">
                <span className={`min-w-0 flex-1 ${compact ? 'text-[0.92rem]' : ''} ${current ? 'font-bold' : 'font-semibold'}`}>
                  {pick(lesson.title, lang)}
                  <span className="sr-only">
                    {done ? `, ${t('player.done')}` : ''}
                    {current ? `, ${t('player.current')}` : ''}
                  </span>
                </span>
                <span className={`flex shrink-0 items-center gap-3 text-muted ${compact ? 'text-[0.8rem]' : 'text-[0.85rem]'}`}>
                  {!compact && <LessonTypeLabel type={lesson.type} />}
                  <span>{fill(t('courses.minutes'), { n: lesson.minutes })}</span>
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
