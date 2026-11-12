import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Lang } from '@intyoza/shared/i18n/translations'
import { AGE_GROUPS, ageGroupLabel } from '@intyoza/shared/learn/courses/helpers'
import { ALL_LANGS } from '@intyoza/shared/learn/courses/staffHelpers'
import type { CourseInput, StaffCourseDetail } from '@intyoza/shared/learn/courses/staffTypes'
import type { LessonType, StaffCategory } from '@intyoza/shared/learn/courses/types'
import type { Localized } from '@intyoza/shared/learn/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { LESSON_TYPES } from '../learn/courses/tones'
import { LessonTypeLabel, LoadError, NotFound, PageSkeleton, StatusBadge } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { hint, useLocalDraft, useUnsavedWarning } from './editing'
import { StaffPageHeader } from './StaffLayout'
import { ConfirmButton, Field, LangTabs, SortableList, Switch } from './ui'

const MIN_POINTS = 3
const MAX_POINTS = 5

const emptyCourse = (categoryId: string): CourseInput => ({
  categoryId,
  title: { en: '' },
  description: { en: '' },
  whatYouLearn: [{ en: '' }, { en: '' }, { en: '' }],
  ageGroups: [],
  givesCertificate: false,
})

const toInput = (c: StaffCourseDetail): CourseInput => ({
  id: c.id,
  categoryId: c.categoryId,
  title: c.title,
  description: c.description,
  whatYouLearn: c.whatYouLearn,
  cover: c.cover,
  ageGroups: c.ageGroups,
  givesCertificate: c.givesCertificate,
})

/** /admin/learn/courses/:courseId (or "new"). A fresh editor per course. */
export function StaffCourseEditorPage() {
  const { courseId = 'new' } = useParams()
  return <StaffCourseEditor key={courseId} courseId={courseId} />
}

function StaffCourseEditor({ courseId }: { courseId: string }) {
  const { t } = useLanguage()
  const isNew = courseId === 'new'
  const query = useLearnQuery(() => Promise.all([isNew ? Promise.resolve(null) : staffClient.course(courseId), staffClient.categories()]), [courseId])

  if (query.status === 'loading') return <PageSkeleton label={t('common.loading')} rows={5} />
  if (query.status === 'error') return <LoadError onRetry={query.reload} />
  const [course, categories] = query.data
  if (!isNew && !course) return <NotFound text="staff.courses.notFound" backTo="/admin/learn/courses" backLabel="staff.nav.courses" />

  return <CourseForm course={course} categories={categories} onReload={query.reload} />
}

function CourseForm({ course, categories, onReload }: { course: StaffCourseDetail | null; categories: StaffCategory[]; onReload: () => void }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const initial = useMemo(() => (course ? toInput(course) : emptyCourse(categories[0]?.id ?? '')), [course, categories])
  const [form, setForm] = useState<CourseInput>(initial)
  const [lang, setLang] = useState<Lang>('en')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [attempted, setAttempted] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  useUnsavedWarning(dirty)
  const draft = useLocalDraft(`course.${course?.id ?? 'new'}`, form, dirty)
  const [draftOffered, setDraftOffered] = useState(() => Boolean(draft.restored) && JSON.stringify(draft.restored) !== JSON.stringify(initial))

  const errors = {
    title: !form.title.en?.trim() ? t('staff.required') : undefined,
    ages: form.ageGroups.length === 0 ? t('staff.courses.agesRequired') : undefined,
  }
  const valid = !errors.title && !errors.ages

  const setText = (field: 'title' | 'description', value: string) => setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: value } }))
  const setPoint = (i: number, value: string) =>
    setForm((f) => ({ ...f, whatYouLearn: f.whatYouLearn.map((p, j) => (j === i ? ({ ...p, [lang]: value } as Localized) : p)) }))
  const complete = (l: Lang) => Boolean(form.title[l]?.trim() && form.description[l]?.trim() && form.whatYouLearn.every((p) => p[l]?.trim()))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (!valid) return
    setSaving(true)
    setMessage(null)
    try {
      const saved = await staffClient.saveCourse({ ...form, whatYouLearn: form.whatYouLearn.filter((p) => p.en?.trim()) })
      draft.clear()
      if (!course) navigate(`/admin/learn/courses/${saved.id}`, { replace: true })
      else {
        setMessage({ kind: 'ok', text: t('staff.saved') })
        onReload()
      }
    } catch {
      setMessage({ kind: 'error', text: t('staff.saveError') })
    } finally {
      setSaving(false)
    }
  }

  const uploadCover = async (file: File | undefined) => {
    if (!file) return
    try {
      const media = await staffClient.uploadMedia(file)
      setForm((f) => ({ ...f, cover: media.url }))
    } catch {
      setMessage({ kind: 'error', text: t('staff.uploadError') })
    }
  }

  return (
    <>
      <Link to="/admin/learn/courses" className="mb-3 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-muted no-underline hover:text-brand">
        <Icon name="arrowLeft" size={14} /> {t('staff.nav.courses')}
      </Link>
      <StaffPageHeader
        title={course ? form.title.en || course.title.en : t('staff.courses.add')}
        intro={t('staff.courses.editorIntro')}
        actions={course && <StatusBadge status={course.status} />}
      />

      {draftOffered && draft.restored && (
        <div className="notice mb-5 flex-wrap" role="status">
          <Icon name="info" size={18} />
          <p className="flex-1">{t('staff.draftFound')}</p>
          <span className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setForm(draft.restored!)
                setDraftOffered(false)
              }}
            >
              {t('staff.draftRestore')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                draft.clear()
                setDraftOffered(false)
              }}
            >
              {t('staff.draftDiscard')}
            </button>
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
        <form onSubmit={submit} className="card flex flex-col gap-5 p-6" noValidate>
          <Field label={t('staff.col.category')}>
            {(id) => (
              <select id={id} className="select" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.en}
                    {c.visible ? '' : ` (${t('staff.hidden')})`}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div>
            <LangTabs langs={ALL_LANGS} value={lang} onChange={setLang} complete={complete} label={t('staff.languages')} />
            <div role="tabpanel" id={`panel-${lang}`} aria-labelledby={`tab-${lang}`} className="flex flex-col gap-4 pt-4">
              <Field label={t('staff.courses.title')} error={lang === 'en' && attempted ? errors.title : undefined}>
                {(id, describedBy) => (
                  <input id={id} aria-describedby={describedBy} className="input" value={form.title[lang] ?? ''} placeholder={lang !== 'en' ? form.title.en : undefined} onChange={(e) => setText('title', e.target.value)} />
                )}
              </Field>
              <Field label={t('staff.description')} hintText={t('staff.courses.descriptionHint')}>
                {(id, describedBy) => (
                  <textarea
                    id={id}
                    aria-describedby={describedBy}
                    className="textarea min-h-20"
                    value={form.description[lang] ?? ''}
                    placeholder={lang !== 'en' ? form.description.en : undefined}
                    onChange={(e) => setText('description', e.target.value)}
                  />
                )}
              </Field>
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-1.5 p-0 text-[0.85rem] font-semibold">{t('courses.whatYouLearn')}</legend>
                {form.whatYouLearn.map((point, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      aria-label={`${t('staff.courses.point')} ${i + 1}`}
                      value={point[lang] ?? ''}
                      placeholder={lang !== 'en' ? point.en : undefined}
                      onChange={(e) => setPoint(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="icon-btn size-11"
                      aria-label={`${t('staff.remove')} ${t('staff.courses.point')} ${i + 1}`}
                      disabled={form.whatYouLearn.length <= MIN_POINTS}
                      onClick={() => setForm((f) => ({ ...f, whatYouLearn: f.whatYouLearn.filter((_, j) => j !== i) }))}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <p className={hint}>{t('staff.courses.pointsHint')}</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={form.whatYouLearn.length >= MAX_POINTS}
                    onClick={() => setForm((f) => ({ ...f, whatYouLearn: [...f.whatYouLearn, { en: '' }] }))}
                  >
                    <Icon name="plus" size={14} /> {t('staff.courses.addPoint')}
                  </button>
                </div>
              </fieldset>
            </div>
          </div>

          <fieldset className="m-0 border-0 p-0" aria-describedby={attempted && errors.ages ? 'ages-error' : undefined}>
            <legend className="mb-1.5 p-0 text-[0.85rem] font-semibold">{t('staff.col.ages')}</legend>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((group) => (
                <label key={group} className="chip has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={form.ageGroups.includes(group)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ageGroups: e.target.checked ? [...f.ageGroups, group].sort() : f.ageGroups.filter((g) => g !== group) }))
                    }
                  />
                  {ageGroupLabel(group)}
                </label>
              ))}
            </div>
            {attempted && errors.ages && (
              <p id="ages-error" className="mt-1 mb-0 text-[0.8rem] font-semibold text-coral">
                {errors.ages}
              </p>
            )}
          </fieldset>

          <Switch checked={form.givesCertificate} onChange={(givesCertificate) => setForm((f) => ({ ...f, givesCertificate }))} label={t('staff.courses.certificate')} />

          <div>
            <p className="mt-0 mb-1.5 text-[0.85rem] font-semibold">{t('staff.courses.cover')}</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.cover ? <img src={form.cover} alt="" className="h-20 w-36 rounded-lg border border-line object-cover" /> : <span className={hint}>{t('staff.courses.noCover')}</span>}
              <label className="btn btn-sm btn-ghost cursor-pointer">
                <Icon name="plus" size={14} /> {t('staff.upload')}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadCover(e.target.files?.[0])} />
              </label>
              {form.cover && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setForm((f) => ({ ...f, cover: undefined }))}>
                  {t('staff.remove')}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
            {message && (
              <p className={`m-0 mr-auto text-[0.9rem] font-semibold ${message.kind === 'ok' ? 'text-success' : 'text-coral'}`} role={message.kind === 'ok' ? 'status' : 'alert'}>
                {message.text}
              </p>
            )}
            {dirty && <span className="text-[0.85rem] text-muted">{t('staff.unsaved')}</span>}
            <button type="submit" className="btn btn-primary" disabled={saving || (!dirty && Boolean(course))} aria-busy={saving}>
              {course ? t('staff.save') : t('staff.courses.create')}
            </button>
          </div>
        </form>

        {course ? <LessonsPanel course={course} onChanged={onReload} /> : <div className="card text-[0.92rem] text-muted">{t('staff.courses.lessonsAfterCreate')}</div>}
      </div>
    </>
  )
}

/** The course's lessons: reorder, open, remove, and add a lesson of a chosen type. */
function LessonsPanel({ course, onChanged }: { course: StaffCourseDetail; onChanged: () => void }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [order, setOrder] = useState<string[] | null>(null)
  const [type, setType] = useState<LessonType>('article')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const lessons = order ? order.map((id) => course.lessons.find((l) => l.id === id)!).filter(Boolean) : course.lessons

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setFailed(false)
    try {
      await action()
      setOrder(null)
      onChanged()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card flex flex-col gap-4 p-5" aria-labelledby="course-lessons">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="course-lessons" className="m-0 text-[1.1rem]">
          {t('staff.col.lessons')}
        </h2>
        <span className="text-[0.85rem] text-muted">{t('staff.courses.lessonsHint')}</span>
      </div>

      {lessons.length === 0 ? (
        <p className="m-0 text-[0.92rem] text-muted">{t('staff.courses.noLessons')}</p>
      ) : (
        <SortableList
          items={lessons}
          getId={(l) => l.id}
          getLabel={(l) => l.title.en || t('staff.untitled')}
          onReorder={(ids) => {
            setOrder(ids)
            staffClient.reorderLessons(course.id, ids).catch(() => {
              setFailed(true)
              setOrder(null)
            })
          }}
          renderItem={(l) => (
            <div className="flex flex-col gap-1">
              <Link to={`/admin/learn/lessons/${l.id}`} className="font-semibold text-fg no-underline hover:text-brand hover:underline">
                {l.title.en || t('staff.untitled')}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted">
                <LessonTypeLabel type={l.type} />
                <StatusBadge status={l.status} />
                {l.languages.map((lang) => (
                  <span key={lang} className="tag px-1.5 uppercase">
                    {lang}
                  </span>
                ))}
                <ConfirmButton label={t('staff.remove')} confirmLabel={t('staff.courses.confirmRemoveLesson')} onConfirm={() => run(() => staffClient.removeLesson(l.id))} />
              </div>
            </div>
          )}
        />
      )}

      {failed && (
        <p className="m-0 text-[0.88rem] font-semibold text-coral" role="alert">
          {t('staff.saveError')}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <Field label={t('staff.courses.newLessonType')}>
          {(id) => (
            <select id={id} className="select min-w-44" value={type} onChange={(e) => setType(e.target.value as LessonType)}>
              {(Object.keys(LESSON_TYPES) as LessonType[]).map((value) => (
                <option key={value} value={value}>
                  {t(LESSON_TYPES[value].label)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const lesson = await staffClient.addLesson(course.id, type)
              navigate(`/admin/learn/lessons/${lesson.id}`)
            })
          }
        >
          <Icon name="plus" size={16} /> {t('staff.courses.addLesson')}
        </button>
      </div>
    </section>
  )
}
