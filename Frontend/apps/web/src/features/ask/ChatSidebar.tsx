import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import type { ChatThread } from '@intyoza/shared/chat/chatStore'
import { quickExit } from '../../lib/privacy/consent'
import { usePrivacy } from '../../privacy/context'

type Props = {
  threads: ChatThread[]
  activeId?: string
  onNew: () => void
  onSelect: (id: string) => void
  onClearAll: () => void
}

const DAY = 86_400_000

function groupOf(iso: string, now = new Date()): TKey {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const time = new Date(iso).getTime()
  if (time >= startOfToday) return 'ask.today'
  if (time >= startOfToday - 6 * DAY) return 'ask.thisWeek'
  return 'ask.earlier'
}

export function ChatSidebar({ threads, activeId, onNew, onSelect, onClearAll }: Props) {
  const { t } = useLanguage()
  const { consent } = usePrivacy()
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = q
    ? threads.filter((th) => th.title.toLowerCase().includes(q) || th.messages.some((m) => m.text.toLowerCase().includes(q)))
    : threads

  const groups = new Map<TKey, ChatThread[]>()
  for (const th of visible) {
    const key = groupOf(th.updatedAt)
    groups.set(key, [...(groups.get(key) ?? []), th])
  }

  return (
    <div className="flex min-h-full flex-col gap-3.5 px-3.5 py-[18px]">

      <button type="button" className="btn btn-primary min-h-[46px] w-full" onClick={onNew}>
        <Icon name="plus" size={18} /> {t('ask.newChat')}
      </button>

      <label className="flex items-center gap-2 rounded-[14px] bg-surface-2 px-3.5 text-muted focus-within:outline-2 focus-within:outline-focus">
        <Icon name="search" size={18} />
        <span className="sr-only">{t('ask.searchChats')}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('ask.searchChats')}
          className="h-[42px] min-w-0 flex-1 bg-transparent text-fg outline-none"
        />
      </label>

      <nav className="flex-1" aria-label={t('ask.history')}>
        {[...groups].map(([group, items]) => (
          <div key={group}>
            <h2 className="mx-2.5 mt-3 mb-1.5 text-[0.8rem] font-medium text-muted">{t(group)}</h2>
            <ul>
              {items.map((th) => (
                <li key={th.id}>
                  <button
                    type="button"
                    aria-current={th.id === activeId ? 'page' : undefined}
                    onClick={() => onSelect(th.id)}
                    className="w-full rounded-[10px] px-3 py-[9px] text-left text-[0.92rem] text-fg hover:bg-surface-2 aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold"
                  >
                    {th.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {threads.length > 0 && visible.length === 0 && <p className="text-[0.85rem] text-muted">{t('ask.noChatsFound')}</p>}
      </nav>

      <div className="flex flex-col gap-1.5 border-t border-line pt-3.5">
        <p className="m-0 mb-1 flex items-center gap-2 px-3 text-[0.8rem] text-muted">
          <Icon name="lock" size={14} className="shrink-0 text-brand" />
          {consent?.chats ? t('ask.savedBrowser') : t('ask.savedTab')}
        </p>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-[9px] text-left text-[0.92rem] text-fg hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={threads.length === 0}
          onClick={() => {
            if (window.confirm(t('ask.clearConfirm'))) onClearAll()
          }}
        >
          <Icon name="trash" size={16} className="shrink-0 text-muted" /> {t('ask.clearAll')}
        </button>
        <button type="button" className="btn btn-sm btn-dark w-full" onClick={quickExit}>
          <Icon name="close" size={16} /> {t('privacy.quickExit')}
        </button>
      </div>
    </div>
  )
}
