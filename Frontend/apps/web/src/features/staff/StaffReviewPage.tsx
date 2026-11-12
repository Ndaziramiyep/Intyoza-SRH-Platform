import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Lang } from '@intyoza/shared/i18n/translations'
import { ALL_LANGS, languageComplete } from '@intyoza/shared/learn/courses/staffHelpers'
import type { ReviewDecision } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { useAccount } from '../account/context'
import { LessonTypeLabel, LoadError, NotFound, PageSkeleton, StatusBadge } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { lessonLines } from './diff'
import { useRuleMessage } from './editing'
import { PhonePreview } from './PhonePreview'
import { staffRoleOf } from './roles'
import { StaffPageHeader } from './StaffLayout'
import { LangTabs } from './ui'

// One lesson waiting for health review: read in every language, as a learner sees it and as plain
// text, then approve it or send it back with a comment. Reviewers see content only, never learners.
// Only health reviewers decide; admins can read along.

export function StaffReviewPage() {
  const { lessonId = '' } = useParams()
  const { t } = useLanguage()
  const { user } = useAccount()
  const ruleMessage = useRuleMessage()
  const reviewer = staffRoleOf(user) === 'health_reviewer'
  const query = useLearnQuery(async () => {
    const lesson = await staffClient.lesson(lessonId)
    const course = lesson ? await staffClient.course(lesson.courseId) : null
    return { lesson, course }
  }, [lessonId])
  const [lang, setLang] = useState<Lang>('en')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<ReviewDecision | null>(null)
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [commentMissing, setCommentMissing] = useState(false)

  if (query.status === 'loading') return <PageSkeleton label={t('common.loading')} rows={4} />
  if (query.status === 'error') return <LoadError onRetry={query.reload} />
  const { lesson, course } = query.data
  if (!lesson) return <NotFound text="staff.lessons.notFound" backTo="/admin/reviews" backLabel="staff.nav.reviews" />

  const decide = async (decision: ReviewDecision, e?: FormEvent) => {
    e?.preventDefault()
    if (decision === 'changes_requested' && !comment.trim()) {
      setCommentMissing(true)
      return
    }
    setBusy(decision)
    setResult(null)
    try {
      await staffClient.reviewLesson(lesson.id, decision, comment)
      setResult({ kind: 'ok', text: decision === 'approved' ? t('staff.review.approvedDone') : t('staff.review.changesDone') })
      setComment('')
      query.reload()
    } catch (err) {
      setResult({ kind: 'error', text: ruleMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const waiting = lesson.status === 'in_review'

  return (
    <>
      <Link to="/admin/reviews" className="mb-3 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted no-underline hover:text-brand">
        <Icon name="arrowLeft" size={14} /> {t('staff.nav.reviews')}
      </Link>
      <StaffPageHeader
        title={lesson.text.en?.title || t('staff.untitled')}
        intro={course ? `${course.title.en} · ${t('staff.review.intro')}` : t('staff.review.intro')}
        actions={
          <span className="flex items-center gap-3 text-[0.88rem] text-muted">
            <LessonTypeLabel type={lesson.type} /> <StatusBadge status={lesson.status} />
          </span>
        }
      />

      {lesson.hasPublishedVersion && <p className="notice mb-5">{t('staff.review.editNote')}</p>}

      <div className="grid items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-6 max-sm:p-4" aria-label={t('staff.review.content')}>
          <LangTabs langs={ALL_LANGS} value={lang} onChange={setLang} complete={(l) => languageComplete(lesson, l)} label={t('staff.languages')} />
          <div role="tabpanel" id={`panel-${lang}`} aria-labelledby={`tab-${lang}`} className="grid gap-6 pt-5 min-[760px]:grid-cols-[auto_minmax(0,1fr)]">
            <PhonePreview lesson={lesson} lang={lang} />
            <div>
              <h2 className="mt-0 mb-2 text-[1rem]">{t('staff.review.fullText')}</h2>
              {languageComplete(lesson, lang) ? null : <p className="notice notice-warn mb-3 text-[0.88rem]">{t('staff.review.incomplete')}</p>}
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[0.9rem]">
                {lessonLines(lesson, lang).map((line, i) => {
                  const [label, ...rest] = line.split(': ')
                  return (
                    <li key={i} className="rounded-md bg-surface-2 px-3 py-2">
                      <span className="block text-[0.75rem] font-bold tracking-[0.03em] text-muted uppercase">{label}</span>
                      {rest.join(': ') || <span className="text-muted italic">{t('staff.review.empty')}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4 min-[1180px]:sticky min-[1180px]:top-[88px]">
          {lesson.lastReview && (
            <section className="card p-5 text-[0.9rem]" aria-labelledby="last-review">
              <h2 id="last-review" className="mt-0 mb-1 text-[0.95rem]">
                {t('staff.review.last')}
              </h2>
              <p className="m-0 font-semibold">
                {lesson.lastReview.decision === 'approved' ? t('staff.status.approved') : t('staff.status.changes_requested')} · {lesson.lastReview.reviewer}
              </p>
              {lesson.lastReview.comment && <p className="mt-1 mb-0 text-muted">{lesson.lastReview.comment}</p>}
            </section>
          )}

          {waiting && reviewer ? (
            <form className="card flex flex-col gap-3 p-5" onSubmit={(e) => decide('approved', e)} aria-labelledby="decision-title">
              <h2 id="decision-title" className="m-0 text-[1rem]">
                {t('staff.review.decision')}
              </h2>
              <label htmlFor="review-comment" className="text-[0.85rem] font-semibold">
                {t('staff.review.comment')}
              </label>
              <textarea
                id="review-comment"
                className="textarea min-h-28"
                value={comment}
                aria-describedby="review-comment-hint"
                aria-invalid={commentMissing && !comment.trim()}
                onChange={(e) => {
                  setComment(e.target.value)
                  setCommentMissing(false)
                }}
              />
              <p id="review-comment-hint" className={`m-0 text-[0.8rem] ${commentMissing ? 'font-semibold text-coral' : 'text-muted'}`}>
                {commentMissing ? t('staff.error.COMMENT_REQUIRED') : t('staff.review.commentHint')}
              </p>
              <button type="submit" className="btn btn-primary" disabled={busy !== null} aria-busy={busy === 'approved'}>
                <Icon name="check" size={16} /> {t('staff.review.approve')}
              </button>
              <button type="button" className="btn btn-outline" disabled={busy !== null} aria-busy={busy === 'changes_requested'} onClick={() => decide('changes_requested')}>
                {t('staff.review.requestChanges')}
              </button>
            </form>
          ) : (
            <p className="notice m-0">
              <Icon name="info" size={18} /> {waiting ? t('staff.review.readOnly') : t('staff.review.notWaiting')}
            </p>
          )}

          {result && (
            <p className={`m-0 text-[0.9rem] font-semibold ${result.kind === 'ok' ? 'text-success' : 'text-coral'}`} role={result.kind === 'ok' ? 'status' : 'alert'}>
              {result.text}
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
