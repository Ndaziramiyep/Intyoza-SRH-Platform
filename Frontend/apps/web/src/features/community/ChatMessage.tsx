import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { timeAgo } from '@intyoza/shared/format'
import type { Post, Reply, ReportReason } from '@intyoza/shared/community/types'
import type { LiveCommunityApi } from '@intyoza/shared/community/useLiveCommunity'

const REPORT_REASONS: { value: ReportReason; label: TKey }[] = [
  { value: 'someone-in-danger', label: 'report.danger' },
  { value: 'harassment', label: 'report.harassment' },
  { value: 'personal-info', label: 'report.personal' },
  { value: 'harmful-advice', label: 'report.harmful' },
  { value: 'spam', label: 'report.spam' },
  { value: 'other', label: 'report.other' },
]

type Props = { post: Post; reply?: Reply; api: LiveCommunityApi; onReply: (post: Post) => void }

/** One bubble in a group chat: a post, or a reply (`reply`) that quotes the post it answers. */
export function ChatMessage({ post, reply, api, onReply }: Props) {
  const { t } = useLanguage()
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState<ReportReason>('someone-in-danger')
  const [sendingReport, setSendingReport] = useState(false)
  const [reportFailed, setReportFailed] = useState(false)

  const message = reply ?? post
  const mine = Boolean(message.isMine)
  const moderator = Boolean(message.isModerator)
  const pending = reply ? Boolean(reply.pending) : post.status === 'pending'

  const sendReport = async () => {
    setSendingReport(true)
    setReportFailed(false)
    const sent = await api.report(post.id, reason)
    setSendingReport(false)
    setReportFailed(!sent)
  }

  const bubble = mine
    ? 'rounded-br-md bg-brand text-on-brand'
    : moderator
      ? 'rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft'
      : 'rounded-bl-md border border-line bg-surface'

  return (
    <article className={`message-enter flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
      {!mine && (
        <span aria-hidden="true" className="mb-9 grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.85rem] font-extrabold text-brand">
          {moderator ? <Icon name="shield" size={15} /> : message.author.charAt(0)}
        </span>
      )}

      <div className={`flex min-w-0 max-w-[80%] flex-col gap-1 max-[480px]:max-w-[86%] ${mine ? 'items-end' : 'items-start'}`}>
        <div className={`max-w-full rounded-[18px] px-3.5 py-2.5 ${bubble}`}>
          {!mine && (
            <p className="m-0 mb-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.85rem] font-bold text-brand">
              {message.author}
              {moderator && <span className="tag tag-brand">{t('community.moderator')}</span>}
              {!reply && post.isExample && <span className="tag font-normal">{t('community.examplePost')}</span>}
            </p>
          )}

          {reply && (
            <blockquote className={`m-0 mb-1.5 rounded-lg border-l-[3px] px-2.5 py-1 text-[0.85rem] ${mine ? 'border-on-brand bg-on-brand/15' : 'border-brand bg-surface-2'}`}>
              <strong className="block">{post.isMine ? t('common.you') : post.author}</strong>
              <span className="line-clamp-1 wrap-anywhere">{post.text}</span>
            </blockquote>
          )}

          <p className="m-0 wrap-anywhere whitespace-pre-wrap">{message.text}</p>

          {pending && (
            <p className={`m-0 mt-1.5 flex items-start gap-1.5 text-[0.75rem] ${mine ? 'text-on-brand/85' : 'text-muted'}`}>
              <Icon name="clock" size={12} className="mt-0.5 shrink-0" />
              {t(reply ? 'community.awaitingReview' : 'community.pendingNote')}
            </p>
          )}
          <p className={`m-0 mt-1 text-right text-[0.75rem] ${mine ? 'text-on-brand/85' : 'text-muted'}`}>
            <time dateTime={message.createdAt}>{timeAgo(message.createdAt, t)}</time>
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          {post.status === 'published' && (
            <button type="button" className="chat-action" aria-label={t('community.reply')} title={t('community.reply')} onClick={() => onReply(post)}>
              <Icon name="chat" size={16} />
            </button>
          )}
          {!reply && !post.isMine && !post.isModerator && (
            <button type="button" className="chat-action" aria-expanded={reporting} aria-label={t('community.report')} title={t('community.report')} onClick={() => setReporting((r) => !r)}>
              <Icon name="flag" size={16} />
            </button>
          )}
        </div>

        {reporting && (
          <div className="flex w-full min-w-[240px] flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 [&_p]:m-0">
            <label className="label" htmlFor={`reason-${post.id}`}>
              {t('community.reportWhy')}
            </label>
            <select id={`reason-${post.id}`} className="select" value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.label)}
                </option>
              ))}
            </select>
            <p className="text-[0.85rem] text-muted">{t('community.reportNote')}</p>
            {reportFailed && (
              <p className="text-[0.92rem] text-brand" role="alert">
                {t('community.reportError')}
              </p>
            )}
            <div className="chip-row">
              <button type="button" className="btn btn-sm btn-accent" disabled={sendingReport} onClick={() => void sendReport()}>
                {t('community.sendReport')}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setReporting(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
