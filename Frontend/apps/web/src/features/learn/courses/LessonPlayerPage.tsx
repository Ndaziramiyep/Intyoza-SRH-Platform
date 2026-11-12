import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fill } from '@intyoza/shared/i18n/translations'
import type { CourseDetail, Lesson, LessonSummary } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { pick, useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'
import { useChatWidget } from '../../ask/chatWidgetContext'
import { MythFactActivity } from '../MythFactActivity'
import { ArticleScreens } from './ArticleScreens'
import { CourseMedia } from './CourseMedia'
import { CourseQuiz } from './CourseQuiz'
import { LessonList } from './LessonList'
import { CheckedBadge, LessonTypeLabel, LoadError, NotFound, PageSkeleton, ProgressBar } from './ui'
import { useLearnQuery } from './useLearnQuery'
import { useLowData } from './useLowData'

// The lesson player: the course's lessons beside the lesson being played (a "Lessons 2/5" sheet on
// a phone), the lesson itself, and under it Mark as done, Next lesson and Ask Intyoza.
// Progress shows at once and is saved in the background; if saving fails the check goes away again
// and the learner is told. The browser tab title is never set to a lesson or course name.

/** Time on one lesson counted at most, so a tab left open overnight doesn't count as study. */
const MAX_SECONDS = 60 * 60

export function LessonPlayerPage() {
  const { slug = '', lessonId = '' } = useParams()
  const { t, lang } = useLanguage()
  const courseQuery = useLearnQuery(() => learnClient.course(slug), [slug])
  const lessonQuery = useLearnQuery(() => learnClient.lesson(lessonId, lang), [lessonId, lang])
  // Progress saved during this visit, ahead of the next reload of the course.
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  // The lesson whose progress couldn't be saved; the message goes away on another lesson.
  const [failedId, setFailedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const course = courseQuery.status === 'success' ? courseQuery.data : null
  const isDone = useCallback((lesson: Pick<LessonSummary, 'id' | 'done'>) => saved[lesson.id] ?? lesson.done, [saved])

  // Time spent on the lesson, sent with "done".
  const started = useRef(0)
  useEffect(() => {
    started.current = Date.now()
  }, [lessonId])

  const markDone = useCallback(
    async (id: string) => {
      if (saved[id]) return true
      setSaved((s) => ({ ...s, [id]: true }))
      setFailedId(null)
      try {
        const seconds = Math.min(MAX_SECONDS, Math.round((Date.now() - started.current) / 1000))
        await learnClient.markLessonDone(id, seconds)
        return true
      } catch {
        setSaved((s) => ({ ...s, [id]: false }))
        setFailedId(id)
        return false
      }
    },
    [saved],
  )

  if (courseQuery.status === 'loading') {
    return (
      <div className="container py-10">
        <PageSkeleton label={t('common.loading')} rows={3} />
      </div>
    )
  }
  if (courseQuery.status === 'error') {
    return (
      <div className="container py-10">
        <LoadError onRetry={courseQuery.reload} />
      </div>
    )
  }
  const summary = course?.lessons.find((l) => l.id === lessonId)
  if (!course || !summary) {
    return (
      <div className="container py-10">
        <NotFound text="courses.lessonNotFound" backTo={course ? `/learn/courses/${slug}` : '/learn'} backLabel={course ? 'courses.backToCourse' : 'learn.backToHub'} />
      </div>
    )
  }

  const doneCount = course.lessons.filter(isDone).length
  const percent = Math.round((doneCount / course.lessons.length) * 100)
  const progressLabel = fill(t('courses.progress'), { done: doneCount, total: course.lessons.length })
  const lesson = lessonQuery.status === 'success' ? lessonQuery.data : null

  return (
    <div className="container pt-6 pb-10">
      <div className="grid grid-cols-[280px_minmax(0,1fr)] items-start gap-10 max-[900px]:grid-cols-1 max-[900px]:gap-5">
        {/* Desktop: the course beside the lesson. */}
        <aside className="sticky top-[92px] max-[900px]:hidden" aria-label={t('player.lessonList')}>
          <CourseOutline course={course} currentId={lessonId} isDone={isDone} percent={percent} progressLabel={progressLabel} />
        </aside>

        {/* Phone and tablet: back to the course, and the lessons in a sheet. */}
        <div className="flex items-center justify-between gap-3 min-[901px]:hidden">
          <Link to={`/learn/courses/${course.slug}`} className="inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-muted no-underline hover:text-brand">
            <Icon name="arrowLeft" size={16} /> {t('courses.backToCourse')}
          </Link>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            {fill(t('player.lessons'), { n: summary.order, total: course.lessons.length })} <Icon name="chevronRight" size={14} className="rotate-90" />
          </button>
        </div>

        <article className="min-w-0" aria-labelledby="lesson-title">
          <header className="mb-5">
            <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem] font-semibold text-muted">
              <span>{fill(t('courses.lessonOf'), { n: summary.order, total: course.lessons.length })}</span>
              <LessonTypeLabel type={summary.type} />
              <span>{fill(t('courses.minutes'), { n: summary.minutes })}</span>
            </p>
            <h1 id="lesson-title" className="m-0 font-display text-[clamp(1.5rem,4vw,2.1rem)] leading-tight">
              {lesson?.title ?? pick(summary.title, lang)}
            </h1>
            <CheckedBadge className="mt-3" />
          </header>

          {lessonQuery.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={2} />}
          {lessonQuery.status === 'error' && <LoadError onRetry={lessonQuery.reload} />}
          {lessonQuery.status === 'success' && !lesson && <NotFound text="courses.lessonNotFound" backTo={`/learn/courses/${course.slug}`} backLabel="courses.backToCourse" />}

          {lesson && (
            <>
              {lesson.language !== lang && (
                <p className="notice notice-warn mb-4">
                  <Icon name="globe" size={18} /> {t('courses.notTranslated')}
                </p>
              )}
              <LessonBody key={lesson.id} lesson={lesson} onFinished={() => markDone(lesson.id)} onQuizSaved={() => setSaved((s) => ({ ...s, [lesson.id]: true }))} />
              <LessonFooter course={course} lesson={lesson} done={isDone(lesson)} saveFailed={failedId === lesson.id} markDone={markDone} />
            </>
          )}
        </article>
      </div>

      <LessonSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <CourseOutline
          course={course}
          currentId={lessonId}
          isDone={isDone}
          percent={percent}
          progressLabel={progressLabel}
          onNavigate={() => setSheetOpen(false)}
        />
      </LessonSheet>
    </div>
  )
}

/** Course title, progress bar and the lessons, for the sidebar and the phone sheet. */
function CourseOutline({
  course,
  currentId,
  isDone,
  percent,
  progressLabel,
  onNavigate,
}: {
  course: CourseDetail
  currentId: string
  isDone: (lesson: LessonSummary) => boolean
  percent: number
  progressLabel: string
  onNavigate?: () => void
}) {
  const { t, lang } = useLanguage()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to={`/learn/courses/${course.slug}`}
          onClick={onNavigate}
          className="mb-1 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted no-underline hover:text-brand"
        >
          <Icon name="arrowLeft" size={14} /> {t('courses.backToCourse')}
        </Link>
        <p className="m-0 font-display text-[1.15rem] leading-snug font-bold">{pick(course.title, lang)}</p>
      </div>
      <div className="flex items-center gap-3 text-[0.85rem] font-semibold text-muted">
        <ProgressBar value={percent} label={progressLabel} className="flex-1" />
        <span aria-hidden="true">{fill(t('courses.percentDone'), { n: percent })}</span>
      </div>
      <LessonList courseSlug={course.slug} lessons={course.lessons} isDone={isDone} currentId={currentId} onNavigate={onNavigate} density="compact" />
    </div>
  )
}

/** The lesson itself, by type. Finishing it (last screen, end of a recording, last card) marks it done. */
function LessonBody({ lesson, onFinished, onQuizSaved }: { lesson: Lesson; onFinished: () => void; onQuizSaved: () => void }) {
  const { t } = useLanguage()
  const [lowData] = useLowData()
  const notReady = (
    <div className="notice">
      <Icon name="info" size={18} />
      <p>{t('player.notReady')}</p>
    </div>
  )

  switch (lesson.type) {
    case 'article':
      return lesson.screens?.length ? <ArticleScreens screens={lesson.screens} onReachEnd={onFinished} /> : notReady
    case 'audio':
    case 'video':
      return lesson.media ? <CourseMedia type={lesson.type} media={lesson.media} lowData={lowData} onEnded={onFinished} /> : notReady
    case 'myth_fact':
      return lesson.cards?.length ? <MythFactActivity cards={lesson.cards} onFinish={onFinished} /> : notReady
    case 'quiz': {
      // The server marks an after quiz done when it is submitted.
      const questions = (lesson.questions ?? []).filter((q) => q.use === 'after' || q.use === 'both')
      return questions.length ? <CourseQuiz lessonId={lesson.id} questions={questions} kind="after" onSubmitted={onQuizSaved} /> : notReady
    }
  }
}

/** Under every lesson: Mark as done, Next lesson (or Finish the course), and Ask Intyoza. */
function LessonFooter({
  course,
  lesson,
  done,
  saveFailed,
  markDone,
}: {
  course: CourseDetail
  lesson: Lesson
  done: boolean
  saveFailed: boolean
  markDone: (id: string) => Promise<boolean>
}) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { askIntyoza, openChat } = useChatWidget()
  const [leaving, setLeaving] = useState(false)
  const index = course.lessons.findIndex((l) => l.id === lesson.id)
  const next = course.lessons[index + 1]
  // A quiz with questions is done by answering it, not with a button.
  const answerable = lesson.type === 'quiz' && (lesson.questions?.length ?? 0) > 0

  // Moving on counts as finishing the lesson (except an unanswered quiz). The last lesson waits for
  // the save, so the completion screen sees it.
  const goOn = async () => {
    setLeaving(true)
    const saved = done || answerable ? true : await markDone(lesson.id)
    setLeaving(false)
    if (!saved) return
    navigate(next ? `/learn/courses/${course.slug}/lessons/${next.id}` : `/learn/courses/${course.slug}/complete`)
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {saveFailed && (
        <p className="notice notice-warn m-0" role="alert">
          <Icon name="alert" size={18} /> {t('player.saveError')}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        {done ? (
          <span className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-success" role="status">
            <Icon name="check" size={18} /> {t('player.done')}
          </span>
        ) : answerable ? (
          <span />
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => markDone(lesson.id)}>
            <Icon name="check" size={18} /> {t('player.markDone')}
          </button>
        )}
        <button type="button" className="btn btn-primary max-sm:flex-1" onClick={goOn} disabled={leaving} aria-busy={leaving}>
          {next ? t('player.next') : t('player.finish')} <Icon name="arrowRight" size={16} />
        </button>
      </div>

      <section className="card flex items-center gap-4 bg-surface-2 max-sm:flex-col max-sm:items-start" aria-labelledby="lesson-ask">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand" aria-hidden="true">
          <Icon name="chat" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="lesson-ask" className="m-0 text-[1rem]">
            {t('player.ask')}
          </h2>
          <p className="m-0 text-[0.9rem] text-muted">{t('player.askText')}</p>
        </div>
        {/* Only a neutral starter question goes to the chat, never the learner's progress. */}
        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => (lesson.askPrompt ? askIntyoza(lesson.askPrompt) : openChat())}>
          {t('home.ctaAsk')}
        </button>
      </section>
    </div>
  )
}

/** Swipe distance that closes the sheet. */
const CLOSE_SWIPE_PX = 80

/** The phone's lesson list: a sheet from the bottom of the screen. Esc, the backdrop or a swipe down close it. */
function LessonSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDialogElement>(null)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const onTouchStart = (e: TouchEvent) => (startY.current = e.touches[0].clientY)
  const onTouchEnd = (e: TouchEvent) => {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > CLOSE_SWIPE_PX) onClose()
    startY.current = null
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={t('player.lessonList')}
      className="sheet-enter fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[22px] border-0 bg-surface p-0 text-fg backdrop:bg-scrim"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-5 pt-2 pb-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <span className="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-line" aria-hidden="true" />
        <span />
        <button type="button" className="icon-btn mt-3" onClick={onClose} aria-label={t('player.close')}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="px-5 pb-8">{children}</div>
    </dialog>
  )
}
