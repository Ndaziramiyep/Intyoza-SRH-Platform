import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { Escalation } from '@intyoza/shared/chat/types'

/** Urgent safety card shown above the answer. */
export function UrgentCard({ escalation }: { escalation: Escalation }) {
  const { t } = useLanguage()

  return (
    <div
      className="rounded-[20px] border border-[color-mix(in_srgb,var(--brand)_35%,transparent)] bg-brand-soft p-[18px]"
      role="alert"
    >
      <h3 className="mb-2.5 flex items-center gap-2.5 text-[1.05rem] text-brand">
        <span className="grid size-8 place-items-center rounded-full bg-brand text-on-brand">
          <Icon name="alert" size={18} />
        </span>
        {escalation.steps ? t('ask.urgentTime') : t('ask.urgent')}
      </h3>
      {/* With its own reply, the reason is already said in the chat. */}
      {!escalation.reply && (
        <p className="mb-3">
          {escalation.reason} {escalation.advice}
        </p>
      )}
      {escalation.steps && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
          {escalation.steps.map((s) => (
            <div key={s.title} className="rounded-[14px] bg-surface p-3.5">
              <h4 className="mb-1 text-[0.95rem]">{s.title}</h4>
              <p className="m-0 text-[0.88rem] text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      )}
      {escalation.contacts && (
        <div className="flex flex-wrap gap-2">
          {escalation.contacts.map((c) => (
            <a key={c.number} href={`tel:${c.number}`} className="btn btn-sm btn-ghost">
              <Icon name="phone" size={16} /> {c.label ? `${c.label}:` : t('ask.call')} <strong>{c.number}</strong>
            </a>
          ))}
        </div>
      )}
      {escalation.note && <p className="mt-3 mb-0 text-[0.88rem] text-brand">{escalation.note}</p>}
    </div>
  )
}

/** "A health worker should check this" note, shown inside the answer. */
export function SoonNote({ escalation }: { escalation: Escalation }) {
  const { t } = useLanguage()

  return (
    <div className="mt-1.5 mb-1 flex gap-2.5 rounded-[14px] bg-brand-soft px-3.5 py-3 text-brand" role="note">
      <Icon name="info" size={18} className="mt-[3px] shrink-0" />
      <p className="m-0">
        {escalation.reason} {escalation.advice}{' '}
        <Link to={`/services?need=${escalation.need}`} className="font-bold text-inherit">
          {t('ask.findCare')}
        </Link>
      </p>
    </div>
  )
}
