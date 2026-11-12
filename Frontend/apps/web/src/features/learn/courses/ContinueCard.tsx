import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import { AGE_GROUPS, ageBandOf, ageGroupLabel, coursePercent } from '@intyoza/shared/learn/courses/helpers'
import type { AgeGroup, Category, ContinueTarget } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { pick, useLanguage } from '../../../i18n/context'
import { useAccount } from '../../account/context'
import { CategoryIcon, CourseMeta, ProgressBar } from './ui'

const shell = 'card flex items-center gap-5 border-brand/25 bg-brand-soft p-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-4 max-sm:p-5'
const eyebrow = 'mb-1 text-[0.8rem] font-bold tracking-[0.06em] text-brand uppercase'

/** The category icon on a white tile, so it stands out on the purple card. Hidden on a phone. */
function CardIcon({ category }: { category?: Category }) {
  if (!category) return null
  return (
    <span className="shrink-0 rounded-[18px] bg-surface p-1.5 shadow-sm max-sm:hidden">
      <CategoryIcon category={category} size={52} />
    </span>
  )
}

/**
 * The top of the Learning Hub: where to pick up (a returning learner), a starter course for the
 * learner's age group (a new learner), or a one-tap age question when the profile has none.
 */
export function ContinueCard({
  target,
  categories,
  askAge,
  onAgeSaved,
}: {
  target: ContinueTarget
  categories: Category[]
  /** True when the profile has no age group yet (and isn't 25+). */
  askAge: boolean
  onAgeSaved: () => void
}) {
  const { t, lang } = useLanguage()

  if (target.kind === 'resume') {
    const { course, lessonId } = target
    const category = categories.find((c) => c.id === course.categoryId)
    const progress = course.progress
    return (
      <section aria-labelledby="hub-continue" className={shell}>
        <CardIcon category={category} />
        <div className="min-w-0 flex-1">
          <h2 id="hub-continue" className={eyebrow}>
            {t('hub.continueTitle')}
          </h2>
          <p className="m-0 font-display text-[1.3rem] leading-snug font-bold">{pick(course.title, lang)}</p>
          {progress && (
            <div className="mt-3 flex max-w-[420px] items-center gap-3 text-[0.88rem] font-semibold text-muted max-sm:flex-col max-sm:items-stretch max-sm:gap-1.5">
              <ProgressBar
                value={coursePercent(course)}
                label={fill(t('courses.progress'), { done: progress.lessonsDone, total: progress.lessonsTotal })}
                className="flex-1 bg-surface"
              />
              <span className="whitespace-nowrap">{fill(t('courses.progress'), { done: progress.lessonsDone, total: progress.lessonsTotal })}</span>
            </div>
          )}
        </div>
        <Link to={`/learn/courses/${course.slug}/lessons/${lessonId}`} className="btn btn-primary shrink-0">
          {t('courses.continue')} <Icon name="arrowRight" size={16} />
        </Link>
      </section>
    )
  }

  if (askAge) return <AgeGroupPicker onSaved={onAgeSaved} />

  if (target.kind === 'starter') {
    const { course } = target
    const category = categories.find((c) => c.id === course.categoryId)
    return (
      <section aria-labelledby="hub-start" className={shell}>
        <CardIcon category={category} />
        <div className="min-w-0 flex-1">
          <h2 id="hub-start" className={eyebrow}>
            {t('hub.startHere')}
          </h2>
          <p className="m-0 font-display text-[1.3rem] leading-snug font-bold">{pick(course.title, lang)}</p>
          <p className="mt-1 mb-0 text-[0.92rem] text-muted">
            {t('hub.starterText')} <CourseMeta lessons={course.lessonCount} minutes={course.minutes} className="whitespace-nowrap" />
          </p>
        </div>
        <Link to={`/learn/courses/${course.slug}`} className="btn btn-primary shrink-0">
          {t('hub.seeCourse')} <Icon name="arrowRight" size={16} />
        </Link>
      </section>
    )
  }

  return null
}

/** Asks for the age group once, and saves it to the profile (PATCH /auth/profile). */
function AgeGroupPicker({ onSaved }: { onSaved: () => void }) {
  const { t } = useLanguage()
  const { updateProfile } = useAccount()
  const [saving, setSaving] = useState<AgeGroup | null>(null)
  const [failed, setFailed] = useState(false)

  const choose = async (group: AgeGroup) => {
    setSaving(group)
    setFailed(false)
    try {
      await updateProfile({ ageBand: ageBandOf(group) })
      onSaved()
    } catch {
      setFailed(true)
    } finally {
      setSaving(null)
    }
  }

  return (
    <section aria-labelledby="hub-age" className={`${shell} max-md:flex-col max-md:items-stretch`}>
      <div className="min-w-0 flex-1">
        <h2 id="hub-age" className="m-0 font-display text-[1.2rem] leading-snug">
          {t('hub.ageTitle')}
        </h2>
        <p className="mt-1 mb-0 max-w-[52ch] text-[0.92rem] text-muted">{t('hub.ageText')}</p>
        {failed && (
          <p className="mt-2 mb-0 text-[0.88rem] font-semibold text-coral" role="alert">
            {t('hub.ageError')}
          </p>
        )}
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-2" role="group" aria-labelledby="hub-age">
        {AGE_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            className="btn btn-outline bg-surface px-4 tabular-nums"
            disabled={saving !== null}
            aria-busy={saving === group}
            onClick={() => choose(group)}
          >
            {saving === group ? <span className="spinner size-4" aria-hidden="true" /> : ageGroupLabel(group)}
          </button>
        ))}
      </div>
    </section>
  )
}
