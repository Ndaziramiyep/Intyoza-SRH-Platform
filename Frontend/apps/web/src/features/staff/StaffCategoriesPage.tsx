import { useEffect, useRef, useState, type FormEvent } from 'react'
import { fill } from '@intyoza/shared/i18n/translations'
import type { CategoryInput } from '@intyoza/shared/learn/courses/staffTypes'
import { ALL_LANGS } from '@intyoza/shared/learn/courses/staffHelpers'
import type { StaffCategory } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { CategoryIcon, LoadError, PageSkeleton } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { LANG_NAMES } from './editing'
import { StaffPageHeader } from './StaffLayout'
import { ConfirmButton, Field, IconPicker, SortableList, Switch, TonePicker } from './ui'

const EMPTY: CategoryInput = { icon: 'book', tone: 'brand', name: { en: '' }, description: { en: '' }, visible: true }

/** Add, rename, reorder, hide and delete the categories learners choose from. */
export function StaffCategoriesPage() {
  const { t } = useLanguage()
  const query = useLearnQuery(() => staffClient.categories(), [])
  const [order, setOrder] = useState<string[] | null>(null)
  const [editing, setEditing] = useState<CategoryInput | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categories = query.status === 'success' ? query.data : []
  // The order shown: the one just set by the staff member, until the list reloads.
  const shown = order ? order.map((id) => categories.find((c) => c.id === id)).filter((c): c is StaffCategory => Boolean(c)) : categories

  const reorder = async (ids: string[]) => {
    setOrder(ids)
    try {
      await staffClient.reorderCategories(ids)
    } catch {
      setError(t('staff.saveError'))
      setOrder(null)
    }
  }

  const remove = async (c: StaffCategory) => {
    try {
      await staffClient.deleteCategory(c.id)
      setOrder(null)
      query.reload()
    } catch {
      setError(t('staff.categories.deleteRefused'))
    }
  }

  return (
    <>
      <StaffPageHeader
        title={t('staff.nav.categories')}
        intro={t('staff.categories.intro')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(EMPTY)}>
            <Icon name="plus" size={16} /> {t('staff.categories.add')}
          </button>
        }
      />
      {error && (
        <p className="notice notice-warn mb-4" role="alert">
          <Icon name="alert" size={18} /> {error}
        </p>
      )}
      {query.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={5} />}
      {query.status === 'error' && <LoadError onRetry={query.reload} />}
      {query.status === 'success' && (
        <SortableList
          items={shown}
          getId={(c) => c.id}
          getLabel={(c) => c.name.en}
          onReorder={reorder}
          renderItem={(c) => (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <CategoryIcon category={c} size={36} />
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold">{c.name.en}</p>
                <p className="m-0 text-[0.82rem] text-muted">
                  {[c.name.rw, c.name.fr].filter(Boolean).join(' · ') || t('staff.categories.noTranslations')}
                </p>
              </div>
              <span className="text-[0.85rem] text-muted tabular-nums">{fill(t('staff.categories.courses'), { n: c.courseCount })}</span>
              <span className={c.visible ? 'tag bg-success-soft text-success' : 'tag'}>{c.visible ? t('staff.visible') : t('staff.hidden')}</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing({ id: c.id, icon: c.icon, tone: c.tone, name: c.name, description: c.description, visible: c.visible })}>
                {t('staff.editButton')}
              </button>
              <ConfirmButton
                label={t('staff.delete')}
                confirmLabel={t('staff.categories.confirmDelete')}
                onConfirm={() => remove(c)}
                disabled={c.courseCount > 0}
                title={c.courseCount > 0 ? fill(t('staff.categories.cannotDelete'), { n: c.courseCount }) : undefined}
              />
            </div>
          )}
        />
      )}

      {editing && (
        <CategoryDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setOrder(null)
            query.reload()
          }}
        />
      )}
    </>
  )
}

/** The category form, in a modal dialog. */
function CategoryDialog({ initial, onClose, onSaved }: { initial: CategoryInput; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<CategoryInput>(initial)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const missingName = !form.name.en.trim()

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const setText = (field: 'name' | 'description', lang: string, value: string) => setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: value } }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (missingName) return
    setSaving(true)
    setFailed(false)
    try {
      await staffClient.saveCategory(form)
      onSaved()
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="category-dialog-title"
      className="m-auto w-[min(640px,calc(100%-32px))] rounded-[22px] border border-line bg-surface p-0 text-fg backdrop:bg-scrim"
    >
      <form onSubmit={submit} className="flex flex-col gap-5 p-7 max-sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 id="category-dialog-title" className="m-0 font-display text-[1.3rem]">
            {initial.id ? t('staff.categories.editTitle') : t('staff.categories.add')}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('player.close')}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {ALL_LANGS.map((lang) => (
          <fieldset key={lang} className="m-0 grid gap-3 rounded-[14px] border border-line p-4 sm:grid-cols-2">
            <legend className="px-1 text-[0.8rem] font-bold tracking-[0.05em] text-muted uppercase">{LANG_NAMES[lang]}</legend>
            <Field label={t('staff.col.name')} error={lang === 'en' && missingName && form !== initial ? t('staff.required') : undefined}>
              {(id, describedBy) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  className="input"
                  value={form.name[lang] ?? ''}
                  required={lang === 'en'}
                  onChange={(e) => setText('name', lang, e.target.value)}
                />
              )}
            </Field>
            <Field label={t('staff.description')}>
              {(id) => <input id={id} className="input" value={form.description[lang] ?? ''} onChange={(e) => setText('description', lang, e.target.value)} />}
            </Field>
          </fieldset>
        ))}

        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="mt-0 mb-1.5 text-[0.85rem] font-semibold">{t('staff.icon')}</p>
            <IconPicker value={form.icon} tone={form.tone} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />
          </div>
          <div>
            <p className="mt-0 mb-1.5 text-[0.85rem] font-semibold">{t('staff.colour')}</p>
            <TonePicker value={form.tone} onChange={(tone) => setForm((f) => ({ ...f, tone }))} />
          </div>
        </div>

        <Switch checked={form.visible} onChange={(visible) => setForm((f) => ({ ...f, visible }))} label={t('staff.categories.visibleLabel')} />

        {failed && (
          <p className="m-0 text-[0.9rem] font-semibold text-coral" role="alert">
            {t('staff.saveError')}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('staff.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || missingName} aria-busy={saving}>
            {t('staff.save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
