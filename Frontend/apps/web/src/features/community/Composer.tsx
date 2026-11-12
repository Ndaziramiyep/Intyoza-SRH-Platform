import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Icon } from '../../components/Icon'
import { detectEscalation } from '@intyoza/shared/chat/safety'
import type { Escalation } from '@intyoza/shared/chat/types'
import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { checkPost } from '@intyoza/shared/community/moderation'
import type { Post } from '@intyoza/shared/community/types'
import { UrgentCard } from '../ask/EscalationCard'

type Props = {
  alias: string
  placeholder: string
  submitLabel: string
  /** Resolves to whether it was saved. What was written stays in the box if it was not. */
  onSubmit: (text: string) => Promise<boolean>
  /** The post being answered, shown above the box. */
  replyTo: Post | null
  onCancelReply: () => void
}

export function Composer({ alias, placeholder, submitLabel, onSubmit, replyTo, onCancelReply }: Props) {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [error, setError] = useState<TKey | null>(null)
  const [warnings, setWarnings] = useState<TKey[]>([])
  const [crisis, setCrisis] = useState<Escalation | null>(null)
  const [sending, setSending] = useState(false)
  const id = useId()
  const box = useRef<HTMLTextAreaElement>(null)
  const replyId = replyTo?.id

  // Choosing Reply puts the cursor in the box.
  useEffect(() => {
    if (replyId) box.current?.focus()
  }, [replyId])

  const publish = async () => {
    // Someone in crisis still gets to post, but sees help options straight away.
    const escalation = detectEscalation(text)
    setCrisis(escalation?.level === 'urgent' ? escalation : null)
    setSending(true)
    const sent = await onSubmit(text.trim())
    setSending(false)
    if (!sent) {
      setError('community.sendError')
      return
    }
    setText('')
    setWarnings([])
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    const result = checkPost(text)
    if (result.blocked) {
      setError(result.blocked)
      return
    }
    setError(null)
    if (result.warnings.length > 0 && warnings.length === 0) {
      setWarnings(result.warnings)
      return
    }
    void publish()
  }

  // Enter sends where there is a keyboard. On a phone it starts a new line and the button sends.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    e.preventDefault()
    e.currentTarget.form?.requestSubmit()
  }

  return (
    <div className="flex max-h-[55%] shrink-0 flex-col gap-2 overflow-y-auto border-t border-line px-3 py-2.5">
      {crisis && <UrgentCard escalation={crisis} />}

      <form onSubmit={submit} className="flex flex-col gap-2">
        {error && (
          <p className="m-0 flex items-start gap-1.5 text-[0.92rem] text-brand [&>svg]:mt-[3px] [&>svg]:shrink-0" role="alert">
            <Icon name="alert" size={16} /> {t(error)}
          </p>
        )}
        {warnings.length > 0 && (
          <div className="notice notice-warn" role="alert">
            <Icon name="eyeOff" size={18} />
            <p>
              {t('community.mayInclude')} <strong>{warnings.map((w) => t(w)).join(t('community.and'))}</strong>
              {t('community.mayIdentify')} <strong>{submitLabel}</strong> {t('community.postAnyway')}
            </p>
          </div>
        )}

        {replyTo && (
          <div className="flex items-center gap-2 rounded-xl border-l-[3px] border-brand bg-surface-2 py-1 pr-1 pl-2.5 text-[0.85rem]">
            <div className="min-w-0 flex-1">
              <strong className="block">{replyTo.isMine ? t('common.you') : replyTo.author}</strong>
              <span className="line-clamp-1 wrap-anywhere text-muted">{replyTo.text}</span>
            </div>
            <button type="button" className="chat-action" aria-label={t('common.cancel')} title={t('common.cancel')} onClick={onCancelReply}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-[24px] border border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-surface p-1 focus-within:outline-3 focus-within:outline-offset-1 focus-within:outline-focus">
          <label className="sr-only" htmlFor={id}>
            {placeholder}
          </label>
          <textarea
            ref={box}
            id={id}
            className={`max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-fg outline-none ${text ? '[field-sizing:content]' : 'overflow-hidden whitespace-nowrap text-ellipsis'}`}
            rows={1}
            maxLength={1500}
            placeholder={placeholder}
            value={text}
            onKeyDown={onKeyDown}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
              setWarnings([])
            }}
          />
          <button type="submit" className="send-circle" aria-label={submitLabel} title={submitLabel} disabled={!text.trim() || sending}>
            <Icon name="send" size={18} />
          </button>
        </div>

        <p className="m-0 flex items-center gap-1.5 px-1 text-[0.78rem] text-muted">
          <Icon name="user" size={12} className="shrink-0" />
          <span className="min-w-0 truncate">
            {t('community.postingAs')} <strong>{alias}</strong>
          </span>
        </p>
      </form>
    </div>
  )
}
