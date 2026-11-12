import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import { ageGroupLabel, ageGroupOf, courseMatches, courseState } from '@intyoza/shared/learn/courses/helpers'
import type { Category, CourseSummary, LessonType } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { Spot } from '../../../components/Illustrations'
import { pick, useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'
import { useAccount } from '../../account/context'
import { ContinueCard } from './ContinueCard'
import { CourseCard } from './CourseCard'
import { FollowUpCard } from './FollowUpCard'
import { LESSON_TYPES, TONE_CLASSES } from './tones'
import { LoadError } from './ui'
import { useLearnQuery } from './useLearnQuery'
import { useLowData } from './useLowData'

// The Learning Hub: choose a course. Continue card, categories, "For you" for the learner's age
// group, then every course with search and lesson-type filters. The category, search and type live
// in the address (?category=&q=&type=), so the back button and shared links keep them.

const TYPES = Object.keys(LESSON_TYPES) as LessonType[]
/** "For you" shows a short row; the full list is below it. */
const FOR_YOU_MAX = 4

const grid = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-4 max-sm:gap-3'

export function LearningHubPage() {
  const { t, lang } = useLanguage()
  const { user } = useAccount()
  const [lowData, setLowData] = useLowData()
  const [params, setParams] = useSearchParams()
  const query = useLearnQuery(
    () => Promise.all([learnClient.categories(), learnClient.courses(), learnClient.forYou(), learnClient.continue()]),
    [user?.ageBand],
  )
  // Loaded on its own: if it fails, the hub still works and the question waits for the next visit.
  const followUps = useLearnQuery(() => learnClient.dueFollowUps(), [])

  const ageGroup = ageGroupOf(user?.ageBand)
  // Ask once the profile has loaded, and never someone who registered as 25 or older.
  const askAge = Boolean(user) && !ageGroup && user?.ageBand !== 'AGE_25_PLUS'

  const categoryParam = params.get('category')
  const search = params.get('q') ?? ''
  const typeParam = params.get('type') as LessonType | null
  const type = typeParam && TYPES.includes(typeParam) ? typeParam : null

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const data = query.status === 'success' ? query.data : null
  const categories = useMemo(() => data?.[0] ?? [], [data])
  const category = categories.find((c) => c.id === categoryParam) ?? null

  const courses = useMemo(
    () =>
      (data?.[1] ?? [])
        .filter((c) => !category || c.categoryId === category.id)
        .filter((c) => !type || c.types.includes(type))
        .filter((c) => courseMatches(c, search)),
    [data, category, type, search],
  )

  // Unfinished courses first, so the row suggests something new.
  const forYou = useMemo(
    () => [...(data?.[2] ?? [])].sort((a, b) => Number(courseState(a) === 'completed') - Number(courseState(b) === 'completed')).slice(0, FOR_YOU_MAX),
    [data],
  )

  const filtering = Boolean(category || type || search.trim())
  const categoryOf = (course: CourseSummary) => categories.find((c) => c.id === course.categoryId)

  return (
    <div className="container pb-8">
      <header className="page-head flex items-center justify-between gap-6">
        <div>
          <h1 className="m-0">{t('feature.learn.title')}</h1>
          <p className="mt-2 mb-0">{t('hub.subtitle')}</p>
        </div>
        <Spot name="learn" className="size-20 shrink-0 max-sm:hidden" />
      </header>

      <div className="mb-6 flex justify-end">
        <label className="check items-center">
          <input type="checkbox" checked={lowData} onChange={(e) => setLowData(e.target.checked)} />
          <span className="inline-flex items-center gap-1.5">
            <Icon name="wifiOff" size={16} /> {t('learn.lowData')}
          </span>
        </label>
      </div>

      {query.status === 'loading' && <HubSkeleton label={t('common.loading')} />}
      {query.status === 'error' && <LoadError onRetry={query.reload} />}

      {data && (
        <div className="flex flex-col gap-10 max-sm:gap-8">
          {followUps.status === 'success' && followUps.data[0] && <FollowUpCard key={followUps.data[0].id} followUp={followUps.data[0]} />}
          <ContinueCard target={data[3]} categories={categories} askAge={askAge} onAgeSaved={query.reload} />

          <section aria-labelledby="hub-categories">
            <h2 id="hub-categories" className="mt-0 mb-3 text-[1.15rem]">
              {t('hub.categories')}
            </h2>
            <CategoryChips categories={categories} total={data[1].length} selected={category} onSelect={(id) => setParam('category', id)} />
          </section>

          {!filtering && ageGroup && forYou.length > 0 && (
            <section aria-labelledby="hub-for-you">
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 id="hub-for-you" className="m-0 text-[1.15rem]">
                  {t('hub.forYou')}
                </h2>
                <span className="text-[0.88rem] text-muted">{fill(t('hub.forYouText'), { ages: ageGroupLabel(ageGroup) })}</span>
              </div>
              <ul className="scroll-row m-0 list-none p-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] sm:gap-4">
                {forYou.map((course) => (
                  <li key={course.id} className="flex w-[78vw] max-w-[300px] sm:w-auto sm:max-w-none">
                    <CourseCard course={course} category={categoryOf(course)} lowData={lowData} className="w-full" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="hub-all">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <h2 id="hub-all" className="m-0 text-[1.15rem]">
                  {category ? pick(category.name, lang) : t('hub.allCourses')}
                </h2>
                <p className="m-0 text-[0.88rem] text-muted" aria-live="polite">
                  {fill(t('hub.results'), { n: courses.length })}
                </p>
              </div>
              <div className="w-full max-w-[360px] max-sm:max-w-none">
                <label className="sr-only" htmlFor="hub-search">
                  {t('hub.searchLabel')}
                </label>
                <div className="relative">
                  <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                  <input
                    id="hub-search"
                    className="input pl-10"
                    type="search"
                    placeholder={t('hub.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setParam('q', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mb-5 chip-row" role="group" aria-label={t('hub.formatLabel')}>
              <button type="button" className="chip" aria-pressed={type === null} onClick={() => setParam('type', null)}>
                {t('common.all')}
              </button>
              {TYPES.map((value) => (
                <button key={value} type="button" className="chip" aria-pressed={type === value} onClick={() => setParam('type', type === value ? null : value)}>
                  <Icon name={LESSON_TYPES[value].icon} size={14} /> {t(LESSON_TYPES[value].label)}
                </button>
              ))}
            </div>

            {courses.length > 0 ? (
              <ul className={`${grid} m-0 list-none p-0`}>
                {courses.map((course) => (
                  <li key={course.id} className="flex">
                    <CourseCard course={course} category={categoryOf(course)} lowData={lowData} compactOnPhone className="w-full" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card flex flex-col items-center gap-4 px-5 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
                  <Icon name="search" size={22} />
                </span>
                <p className="m-0 max-w-[44ch] text-muted">{type || search.trim() ? t('hub.noMatch') : t('hub.emptyCategory')}</p>
                {filtering && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setParams({}, { replace: true })}>
                    {t('hub.clearFilters')}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

/** One chip per category with its icon and course count, plus "All". Scrolls sideways on a phone. */
function CategoryChips({
  categories,
  total,
  selected,
  onSelect,
}: {
  categories: Category[]
  total: number
  selected: Category | null
  onSelect: (id: string | null) => void
}) {
  const { t, lang } = useLanguage()
  const chip =
    'flex min-h-14 cursor-pointer items-center gap-3 rounded-[14px] border-2 border-line bg-surface py-2 pr-4 pl-2 text-left text-fg transition-colors hover:border-brand aria-pressed:border-brand aria-pressed:bg-brand-soft'

  return (
    <div className="scroll-row" role="group" aria-labelledby="hub-categories">
      <button type="button" className={chip} aria-pressed={!selected} onClick={() => onSelect(null)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg" aria-hidden="true">
          <Icon name="book" size={20} />
        </span>
        <span className="flex flex-col">
          <span className="text-[0.93rem] font-bold">{t('common.all')}</span>
          <span className="text-[0.8rem] text-muted">{fill(t('hub.courseCount'), { n: total })}</span>
        </span>
      </button>
      {categories.map((c) => (
        <button key={c.id} type="button" className={chip} aria-pressed={selected?.id === c.id} onClick={() => onSelect(selected?.id === c.id ? null : c.id)}>
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${TONE_CLASSES[c.tone].tile}`} aria-hidden="true">
            <Icon name={c.icon} size={20} />
          </span>
          <span className="flex max-w-[190px] flex-col">
            <span className="text-[0.93rem] leading-tight font-bold">{pick(c.name, lang)}</span>
            <span className="text-[0.8rem] text-muted">{fill(t('hub.courseCount'), { n: c.courseCount })}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

/** The hub's shape while it loads: continue card, a row of chips, then cards. */
function HubSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="animate-pulse">
      <div aria-hidden="true" className="flex flex-col gap-10">
        <div className="h-28 rounded-[14px] bg-surface-2" />
        <div className="flex gap-2.5 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-14 w-44 shrink-0 rounded-[14px] bg-surface-2" />
          ))}
        </div>
        <div className={grid}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 rounded-[14px] bg-surface-2" />
          ))}
        </div>
      </div>
    </div>
  )
}
