import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lang } from '@intyoza/shared/i18n/translations'
import type { StaffLesson } from '@intyoza/shared/learn/courses/staffTypes'
import { ALL_LANGS } from '@intyoza/shared/learn/courses/staffHelpers'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { staffClient } from '../../lib/learn/courseClient'
import { LoadError, PageSkeleton } from '../learn/courses/ui'
import { useLearnQuery } from '../learn/courses/useLearnQuery'
import { diffLines, lessonLines } from './diff'
import { ConfirmButton } from './ui'

const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * Every published version of a lesson: who published it and when, what differs from the lesson now,
 * and Restore (admins), which turns that version into a draft that must be reviewed again.
 */
export function VersionsDialog({ lesson, canRestore, onClose, onRestored }: { lesson: StaffLesson; canRestore: boolean; onClose: () => void; onRestored: () => void }) {
  const { t } = useLanguage()
  const ref = useRef<HTMLDialogElement>(null)
  const query = useLearnQuery(() => staffClient.versions(lesson.id), [lesson.id])
  const [selected, setSelected] = useState<number | null>(null)
  const [lang, setLang] = useState<Lang>('en')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const versions = query.status === 'success' ? query.data : []
  const chosen = versions.find((v) => v.version === selected) ?? versions[0]
  const diff = useMemo(() => (chosen ? diffLines(lessonLines(chosen.snapshot, lang), lessonLines(lesson, lang)) : []), [chosen, lesson, lang])
  const changes = diff.filter((d) => d.kind !== 'same').length

  const restore = async () => {
    if (!chosen) return
    setFailed(false)
    try {
      await staffClient.restoreVersion(lesson.id, chosen.version)
      onRestored()
    } catch {
      setFailed(true)
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="versions-title"
      className="m-0 ml-auto h-dvh max-h-none w-[min(720px,100%)] max-w-none border-0 border-l border-line bg-surface p-0 text-fg backdrop:bg-scrim"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 id="versions-title" className="m-0 font-display text-[1.2rem]">
            {t('staff.versions.title')}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('player.close')}>
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] max-sm:grid-cols-1">
          <nav aria-label={t('staff.versions.title')} className="overflow-y-auto border-r border-line p-3 max-sm:border-r-0 max-sm:border-b">
            {query.status === 'loading' && <PageSkeleton label={t('common.loading')} rows={2} />}
            {query.status === 'error' && <LoadError onRetry={query.reload} />}
            {query.status === 'success' && versions.length === 0 && <p className="m-2 text-[0.88rem] text-muted">{t('staff.versions.none')}</p>}
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {versions.map((v) => (
                <li key={v.version}>
                  <button
                    type="button"
                    aria-current={chosen?.version === v.version ? 'true' : undefined}
                    onClick={() => setSelected(v.version)}
                    className="w-full rounded-[10px] px-3 py-2.5 text-left hover:bg-surface-2 aria-[current]:bg-brand-soft"
                  >
                    <span className="block font-semibold">
                      {t('staff.versions.version')} {v.version}
                    </span>
                    <span className="block text-[0.8rem] text-muted">{dateTime.format(new Date(v.createdAt))}</span>
                    <span className="block text-[0.8rem] text-muted">
                      {v.note} · {v.editedBy}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <section className="flex min-h-0 flex-col gap-3 overflow-y-auto p-5" aria-label={t('staff.versions.changes')}>
            {chosen && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 text-[0.9rem]">
                    {changes === 0 ? t('staff.versions.same') : `${changes} ${t('staff.versions.changedLines')}`} <span className="text-muted">({t('staff.versions.compared')})</span>
                  </p>
                  <div className="chip-row" role="group" aria-label={t('staff.languages')}>
                    {ALL_LANGS.map((l) => (
                      <button key={l} type="button" className="chip min-h-8 px-3 py-1 text-[0.8rem]" aria-pressed={lang === l} onClick={() => setLang(l)}>
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <ol className="m-0 list-none rounded-[12px] border border-line p-0 font-mono text-[0.8rem]">
                  {diff.map((d, i) => (
                    <li
                      key={i}
                      className={`border-b border-line px-3 py-1.5 last:border-b-0 ${d.kind === 'removed' ? 'bg-coral-soft text-coral' : d.kind === 'added' ? 'bg-success-soft text-success' : 'text-muted'}`}
                    >
                      <span aria-hidden="true" className="mr-2 inline-block w-3">
                        {d.kind === 'removed' ? '−' : d.kind === 'added' ? '+' : ' '}
                      </span>
                      <span className="sr-only">{d.kind === 'removed' ? 'Removed: ' : d.kind === 'added' ? 'Added: ' : ''}</span>
                      {d.text}
                    </li>
                  ))}
                </ol>
                {canRestore && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                    <p className="m-0 flex-1 text-[0.85rem] text-muted">{t('staff.versions.restoreNote')}</p>
                    <ConfirmButton label={`${t('staff.versions.restore')} ${chosen.version}`} confirmLabel={t('staff.versions.confirmRestore')} onConfirm={restore} icon="refresh" danger={false} />
                  </div>
                )}
                {failed && (
                  <p className="m-0 text-[0.88rem] font-semibold text-coral" role="alert">
                    {t('staff.saveError')}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </dialog>
  )
}
