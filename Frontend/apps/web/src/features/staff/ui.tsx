import { useId, useRef, useState, type ReactNode } from 'react'
import type { Lang } from '@intyoza/shared/i18n/translations'
import type { CategoryTone } from '@intyoza/shared/learn/courses/types'
import { Icon, type IconName } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { TONE_CLASSES } from '../learn/courses/tones'
import { CATEGORY_ICONS, LANG_NAMES, TONES, fieldLabel, hint } from './editing'

// Building blocks of the staff editors: language tabs, labelled fields, a switch, icon and colour
// pickers, a list that reorders by drag or keyboard, and a confirm-before-acting button.

/** RW / EN / FR tabs. A dot per tab: filled when that language is complete, hollow when not. */
export function LangTabs({
  langs,
  value,
  onChange,
  complete,
  required = ['rw', 'en'],
  label,
}: {
  langs: Lang[]
  value: Lang
  onChange: (lang: Lang) => void
  complete: (lang: Lang) => boolean
  required?: Lang[]
  label: string
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const move = (step: number) => {
    const next = langs[(langs.indexOf(value) + step + langs.length) % langs.length]
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
      {langs.map((lang) => {
        const done = complete(lang)
        const needed = required.includes(lang)
        return (
          <button
            key={lang}
            ref={(el) => {
              refs.current[lang] = el
            }}
            type="button"
            role="tab"
            id={`tab-${lang}`}
            aria-selected={value === lang}
            aria-controls={`panel-${lang}`}
            tabIndex={value === lang ? 0 : -1}
            onClick={() => onChange(lang)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(1)
              else if (e.key === 'ArrowLeft') move(-1)
            }}
            className="-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-4 font-semibold text-muted hover:text-fg aria-selected:border-brand aria-selected:text-brand"
          >
            <span
              className={`size-2.5 rounded-full ${done ? 'bg-success' : needed ? 'border-2 border-amber' : 'border-2 border-line'}`}
              aria-hidden="true"
            />
            {lang.toUpperCase()}
            <span className="sr-only">
              {LANG_NAMES[lang]}, {done ? 'complete' : needed ? 'required, not complete' : 'optional, not complete'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A label, the control, and an optional hint or error, wired together for screen readers. */
export function Field({ label, hintText, error, children }: { label: string; hintText?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId()
  const describedBy = hintText || error ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {children(id, describedBy)}
      {(hintText || error) && (
        <p id={`${id}-hint`} className={error ? 'mt-1 mb-0 text-[0.8rem] font-semibold text-coral' : hint}>
          {error ?? hintText}
        </p>
      )}
    </div>
  )
}

/** An on/off switch (a checkbox styled as a switch). */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 font-semibold has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
      {label}
    </label>
  )
}

/** Icon choices as a radio group. */
export function IconPicker({ value, tone, onChange }: { value: IconName; tone: CategoryTone; onChange: (icon: IconName) => void }) {
  return (
    <div role="radiogroup" aria-label="Icon" className="flex flex-wrap gap-2">
      {CATEGORY_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          role="radio"
          aria-checked={value === icon}
          aria-label={icon}
          onClick={() => onChange(icon)}
          className={`grid size-11 place-items-center rounded-xl border-2 ${value === icon ? `border-brand ${TONE_CLASSES[tone].tile}` : 'border-line bg-surface text-muted hover:border-brand'}`}
        >
          <Icon name={icon} size={20} />
        </button>
      ))}
    </div>
  )
}

/** Colour choices as a radio group. */
export function TonePicker({ value, onChange }: { value: CategoryTone; onChange: (tone: CategoryTone) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex gap-2">
      {TONES.map((tone) => (
        <button
          key={tone}
          type="button"
          role="radio"
          aria-checked={value === tone}
          aria-label={tone}
          onClick={() => onChange(tone)}
          className={`grid size-11 place-items-center rounded-full border-2 ${value === tone ? 'border-fg' : 'border-transparent'}`}
        >
          <span className={`block size-7 rounded-full ${TONE_CLASSES[tone].tile} ring-2 ring-current`} />
        </button>
      ))}
    </div>
  )
}

/**
 * A list that reorders by dragging a row's handle, or with its Move up / Move down buttons from the
 * keyboard. Each move is announced. `onReorder` gets the new order of ids.
 */
export function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  renderItem,
}: {
  items: T[]
  getId: (item: T) => string
  getLabel: (item: T) => string
  onReorder: (ids: string[]) => void
  renderItem: (item: T, index: number) => ReactNode
}) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const ids = items.map(getId)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return
    const next = [...ids]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
    setAnnounce(`${getLabel(items[from])} moved to position ${to + 1} of ${ids.length}`)
  }

  return (
    <>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item, index) => {
          const id = getId(item)
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragging(id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(id)
              }}
              onDragLeave={() => setOver((o) => (o === id ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragging) move(ids.indexOf(dragging), index)
                setDragging(null)
                setOver(null)
              }}
              onDragEnd={() => {
                setDragging(null)
                setOver(null)
              }}
              className={`flex items-center gap-2 rounded-[12px] border bg-surface p-2 pr-3 transition-colors ${
                over === id && dragging !== id ? 'border-brand bg-brand-soft' : 'border-line'
              } ${dragging === id ? 'opacity-50' : ''}`}
            >
              <span className="grid w-6 shrink-0 cursor-grab place-items-center text-muted active:cursor-grabbing" aria-hidden="true" title="Drag to reorder">
                <Icon name="menu" size={16} />
              </span>
              <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="icon-btn size-8" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${getLabel(item)} up`}>
                  <Icon name="chevronRight" size={14} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  className="icon-btn size-8"
                  onClick={() => move(index, index + 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move ${getLabel(item)} down`}
                >
                  <Icon name="chevronRight" size={14} className="rotate-90" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </>
  )
}

/** A button that asks "are you sure?" inline before running a destructive action. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
  title,
  icon = 'trash',
  danger = true,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  title?: string
  icon?: IconName
  /** Red for deleting; neutral for actions such as restoring a version. */
  danger?: boolean
}) {
  const { t } = useLanguage()
  const [asking, setAsking] = useState(false)
  if (asking) {
    return (
      <span className="inline-flex items-center gap-1.5" role="group" aria-label={confirmLabel}>
        <button
          type="button"
          className={danger ? 'btn btn-sm border-coral bg-transparent text-coral hover:bg-coral-soft' : 'btn btn-sm btn-primary'}
          onClick={() => {
            setAsking(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsking(false)}>
          {t('staff.cancel')}
        </button>
      </span>
    )
  }
  return (
    <button type="button" className={`btn btn-sm btn-ghost ${danger ? 'text-coral' : ''}`} onClick={() => setAsking(true)} disabled={disabled} title={title}>
      <Icon name={icon} size={15} /> {label}
    </button>
  )
}
