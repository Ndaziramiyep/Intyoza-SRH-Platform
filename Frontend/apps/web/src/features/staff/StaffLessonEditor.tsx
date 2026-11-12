import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fill, type Lang, type TKey } from '@intyoza/shared/i18n/translations'
import { ALL_LANGS, languageComplete, missingRequired } from '@intyoza/shared/learn/courses/staffHelpers'
import type { StaffCourseDetail, StaffLesson } from '@intyoza/shared/learn/courses/staffTypes'
import type { StaffRole } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { useAccount } from '../account/context'
import { LessonTypeLabel, LoadError, NotFound, PageSkeleton, StatusBadge } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { LANG_NAMES, hint, useLocalDraft, useRuleMessage, useUnsavedWarning } from './editing'
import { LessonContentEditor } from './LessonContentEditor'
import { PhonePreview } from './PhonePreview'
import { staffRoleOf } from './roles'
import { StaffPageHeader } from './StaffLayout'
import { Field, LangTabs } from './ui'
import { VersionsDialog } from './VersionsDialog'

/** /admin/learn/lessons/:lessonId — a fresh editor per lesson. */
export function StaffLessonEditorPage() {
  const { lessonId = '' } = useParams()
  return <StaffLessonEditor key={lessonId} lessonId={lessonId} />
}

function StaffLessonEditor({ lessonId }: { lessonId: string }) {
  const { t } = useLanguage()
  const { user } = useAccount()
  const role = staffRoleOf(user)
  // Kept here, so "Saved" stays on screen when the form reloads the saved lesson.
  const [message, setMessage] = useState<Notice>(null)
  const query = useLearnQuery(async () => {
    const lesson = await staffClient.lesson(lessonId)
    const course = lesson ? await staffClient.course(lesson.courseId) : null
    return { lesson, course }
  }, [lessonId])

  if (query.status === 'loading') return <PageSkeleton label={t('common.loading')} rows={5} />
  if (query.status === 'error') return <LoadError onRetry={query.reload} />
  const { lesson, course } = query.data
  if (!lesson || !role) return <NotFound text="staff.lessons.notFound" backTo="/admin" backLabel="staff.title" />

  return <LessonForm key={lesson.updatedAt} saved={lesson} course={course} role={role} onReload={query.reload} message={message} setMessage={setMessage} />
}

type Notice = { kind: 'ok' | 'error'; text: string } | null

function LessonForm({
  saved,
  course,
  role,
  onReload,
  message,
  setMessage,
}: {
  saved: StaffLesson
  course: StaffCourseDetail | null
  role: StaffRole
  onReload: () => void
  message: Notice
  setMessage: (notice: Notice) => void
}) {
  const { t } = useLanguage()
  const ruleMessage = useRuleMessage()
  const translator = role === 'translator'
  const [draft, setDraft] = useState<StaffLesson>(saved)
  const [lang, setLang] = useState<Lang>(translator ? 'rw' : 'en')
  const [busy, setBusy] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  useUnsavedWarning(dirty)
  const localDraft = useLocalDraft(`lesson.${saved.id}`, draft, dirty)
  const [draftOffered, setDraftOffered] = useState(() => Boolean(localDraft.restored) && JSON.stringify(localDraft.restored) !== JSON.stringify(saved))

  const missing = missingRequired(draft)
  const editable = !translator || lang !== 'en'
  const lockedForReview = draft.status === 'in_review'

  const run = async (action: () => Promise<unknown>, success: TKey) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      localDraft.clear()
      setMessage({ kind: 'ok', text: t(success) })
      onReload()
    } catch (err) {
      setMessage({ kind: 'error', text: ruleMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const save = () =>
    run(async () => {
      if (!translator) return staffClient.saveLesson(draft)
      // A translator saves each language they changed.
      for (const l of ['rw', 'fr'] as Lang[]) {
        const before = JSON.stringify([saved.text[l], saved.questions.map((q) => q.text[l]), saved.cards.map((c) => c.text[l])])
        const after = JSON.stringify([draft.text[l], draft.questions.map((q) => q.text[l]), draft.cards.map((c) => c.text[l])])
        if (before !== after) await staffClient.saveTranslation(draft.id, l, draft)
      }
    }, 'staff.saved')

  const uploadMedia = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const media = await staffClient.uploadMedia(file)
      setDraft((d) => ({ ...d, media: { ...d.media, url: media.url, sizeMb: media.sizeMb } }))
    } catch {
      setMessage({ kind: 'error', text: t('staff.uploadError') })
    } finally {
      setBusy(false)
    }
  }

  const title = draft.text.en?.title || t('staff.untitled')

  return (
    <>
      {course && (
        <Link
          to={translator ? '/admin/translations' : `/admin/learn/courses/${course.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted no-underline hover:text-brand"
        >
          <Icon name="arrowLeft" size={14} /> {translator ? t('staff.nav.translations') : course.title.en}
        </Link>
      )}
      <StaffPageHeader
        title={title}
        intro={translator ? t('staff.lessons.translatorIntro') : t('staff.lessons.intro')}
        actions={
          <span className="flex items-center gap-3 text-[0.88rem] text-muted">
            <LessonTypeLabel type={draft.type} /> <StatusBadge status={saved.status} />
          </span>
        }
      />

      {draftOffered && localDraft.restored && (
        <div className="notice mb-5 flex-wrap" role="status">
          <Icon name="info" size={18} />
          <p className="flex-1">{t('staff.draftFound')}</p>
          <span className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setDraft(localDraft.restored!)
                setDraftOffered(false)
              }}
            >
              {t('staff.draftRestore')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                localDraft.clear()
                setDraftOffered(false)
              }}
            >
              {t('staff.draftDiscard')}
            </button>
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section className="card p-6 max-sm:p-4" aria-label={t('staff.lessons.content')}>
            <LangTabs langs={ALL_LANGS} value={lang} onChange={setLang} complete={(l) => languageComplete(draft, l)} label={t('staff.languages')} />
            <div role="tabpanel" id={`panel-${lang}`} aria-labelledby={`tab-${lang}`} className="pt-5">
              {editable ? (
                <fieldset className="m-0 border-0 p-0" disabled={busy}>
                  <legend className="sr-only">{LANG_NAMES[lang]}</legend>
                  <LessonContentEditor lesson={draft} lang={lang} onChange={setDraft} structureLocked={translator} />
                </fieldset>
              ) : (
                <p className="notice m-0">
                  <Icon name="lock" size={18} /> {t('staff.lessons.englishReadOnly')}
                </p>
              )}
            </div>
          </section>

          {!translator && (
            <section className="card flex flex-col gap-4 p-6 max-sm:p-4" aria-labelledby="lesson-settings">
              <h2 id="lesson-settings" className="m-0 text-[1.05rem]">
                {t('staff.lessons.settings')}
              </h2>
              <Field label={t('staff.lessons.minutes')}>
                {(id) => (
                  <input
                    id={id}
                    type="number"
                    min={1}
                    max={15}
                    className="input w-28"
                    value={draft.minutes}
                    onChange={(e) => setDraft((d) => ({ ...d, minutes: Math.max(1, Number(e.target.value) || 1) }))}
                  />
                )}
              </Field>
              {(draft.type === 'audio' || draft.type === 'video') && (
                <>
                  <div>
                    <p className="mt-0 mb-1.5 text-[0.85rem] font-semibold">{draft.type === 'video' ? t('staff.lessons.videoFile') : t('staff.lessons.audioFile')}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[0.9rem]">{draft.media?.url ? fill(t('staff.lessons.fileSize'), { size: draft.media.sizeMb }) : t('staff.lessons.noFile')}</span>
                      <label className="btn btn-sm btn-ghost cursor-pointer">
                        <Icon name="plus" size={14} /> {t('staff.upload')}
                        <input type="file" accept={draft.type === 'video' ? 'video/*' : 'audio/*'} className="sr-only" onChange={(e) => uploadMedia(e.target.files?.[0])} />
                      </label>
                    </div>
                    <p className={hint}>{t('staff.lessons.fileHint')}</p>
                  </div>
                  {draft.type === 'video' && (
                    <Field label={t('staff.lessons.subtitles')} hintText={t('staff.lessons.subtitlesHint')}>
                      {(id, describedBy) => (
                        <input
                          id={id}
                          aria-describedby={describedBy}
                          className="input"
                          value={draft.media?.subtitlesUrl ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, media: { url: d.media?.url ?? '', sizeMb: d.media?.sizeMb ?? 0, subtitlesUrl: e.target.value || undefined } }))}
                        />
                      )}
                    </Field>
                  )}
                </>
              )}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5 min-[1180px]:sticky min-[1180px]:top-[88px]">
          <section className="card flex flex-col gap-3 p-5" aria-labelledby="lesson-status">
            <h2 id="lesson-status" className="m-0 text-[1rem]">
              {t('staff.col.status')}
            </h2>
            <p className="m-0 flex items-center gap-2">
              <StatusBadge status={saved.status} />
              <span className="text-[0.82rem] text-muted">{fill(t('staff.lessons.updated'), { who: saved.updatedBy })}</span>
            </p>

            {saved.hasPublishedVersion && saved.status !== 'published' && <p className="notice m-0 text-[0.88rem]">{t('staff.lessons.liveVersion')}</p>}
            {saved.status === 'changes_requested' && saved.lastReview && (
              <div className="rounded-[12px] border border-amber/40 bg-amber-soft p-3.5 text-[0.9rem]">
                <p className="m-0 font-bold text-amber">{fill(t('staff.lessons.changesFrom'), { who: saved.lastReview.reviewer })}</p>
                <p className="mt-1 mb-0">{saved.lastReview.comment}</p>
              </div>
            )}
            {lockedForReview && <p className="m-0 text-[0.88rem] text-muted">{t('staff.lessons.inReviewNote')}</p>}

            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <button type="button" className="btn btn-primary" disabled={!dirty || busy} onClick={save} aria-busy={busy}>
                {translator ? t('staff.lessons.saveTranslation') : t('staff.save')}
              </button>
              {dirty && <p className="m-0 text-center text-[0.8rem] text-muted">{t('staff.unsaved')}</p>}

              {!translator && (saved.status === 'writing' || saved.status === 'changes_requested') && (
                <>
                  <button type="button" className="btn btn-outline" disabled={busy || dirty || missing.length > 0} onClick={() => run(() => staffClient.submitLesson(saved.id), 'staff.lessons.submitted')}>
                    <Icon name="shield" size={16} /> {t('staff.lessons.submit')}
                  </button>
                  {(missing.length > 0 || dirty) && (
                    <p className="m-0 text-[0.8rem] text-muted">
                      {dirty ? t('staff.lessons.saveFirst') : fill(t('staff.lessons.missing'), { langs: missing.map((l) => LANG_NAMES[l]).join(' and ') })}
                    </p>
                  )}
                </>
              )}
              {!translator && saved.status === 'approved' && (
                <button type="button" className="btn btn-outline" disabled={busy || dirty} onClick={() => run(() => staffClient.publishLesson(saved.id), 'staff.lessons.published')}>
                  <Icon name="send" size={16} /> {t('staff.lessons.publish')}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setVersionsOpen(true)}>
                <Icon name="clock" size={16} /> {t('staff.versions.title')}
              </button>
            </div>

            {message && (
              <p className={`m-0 text-[0.88rem] font-semibold ${message.kind === 'ok' ? 'text-success' : 'text-coral'}`} role={message.kind === 'ok' ? 'status' : 'alert'}>
                {message.text}
              </p>
            )}
          </section>

          <section className="card flex flex-col items-center gap-3 p-5" aria-labelledby="lesson-preview">
            <h2 id="lesson-preview" className="m-0 self-start text-[1rem]">
              {t('staff.preview')}
            </h2>
            <PhonePreview lesson={draft} lang={lang} />
          </section>
        </aside>
      </div>

      {versionsOpen && (
        <VersionsDialog
          lesson={draft}
          canRestore={!translator}
          onClose={() => setVersionsOpen(false)}
          onRestored={() => {
            setVersionsOpen(false)
            localDraft.clear()
            setMessage({ kind: 'ok', text: t('staff.versions.restored') })
            onReload()
          }}
        />
      )}
    </>
  )
}
