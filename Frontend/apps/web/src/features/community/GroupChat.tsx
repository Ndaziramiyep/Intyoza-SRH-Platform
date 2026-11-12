import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { quickExit } from '../../lib/privacy/consent'
import { useLanguage } from '../../i18n/context'
import type { Community, Post, Reply } from '@intyoza/shared/community/types'
import type { LiveCommunityApi } from '@intyoza/shared/community/useLiveCommunity'
import { useStickToBottom } from '../ask/useStickToBottom'
import { ChatMessage } from './ChatMessage'
import { CommunityImage } from './CommunityImage'
import { Composer } from './Composer'

type Item = { post: Post; reply?: Reply }

const byTime = (a: Item, b: Item) => (a.reply ?? a.post).createdAt.localeCompare((b.reply ?? b.post).createdAt)

/** A group someone has joined, as a chat: moderator posts pinned first, then everything oldest to newest. */
export function GroupChat({ community, api }: { community: Community; api: LiveCommunityApi }) {
  const { t } = useLanguage()
  const [replyToId, setReplyToId] = useState<string | null>(null)

  const posts = api.posts
    .filter((p) => p.communityId === community.id)
    .filter((p) => !api.member.reported.includes(p.id))
    .filter((p) => p.status === 'published' || p.isMine)

  const pinned: Item[] = posts.filter((p) => p.isModerator).map((post) => ({ post }))
  const timeline: Item[] = [
    ...posts.filter((p) => !p.isModerator).map((post) => ({ post })),
    ...posts.flatMap((post) => post.replies.filter((r) => !r.pending || r.isMine).map((reply) => ({ post, reply }))),
  ]
  const items = [...pinned.sort(byTime), ...timeline.sort(byTime)]

  // Follows the post itself, so a reply in progress ends if that post is deleted or reported.
  const replyTo = posts.find((p) => p.id === replyToId) ?? null

  const { ref, onScroll, stick, following } = useStickToBottom<HTMLDivElement>(items.length, community.id)

  // The list gets taller when fonts arrive and shorter when the box or a phone keyboard grows: stay at the end.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const toEnd = () => {
      if (following.current) el.scrollTop = el.scrollHeight
    }
    const resized = new ResizeObserver(toEnd)
    resized.observe(el)
    void document.fonts.ready.then(toEnd)
    return () => resized.disconnect()
  }, [ref, following])

  return (
    <section
      className="group-chat flex h-[min(720px,calc(100dvh-104px))] flex-col overflow-hidden rounded-[22px] border border-line bg-surface max-[700px]:h-[calc(100dvh-160px)]"
      aria-label={community.name}
    >
      <header className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <Link to="/community" className="icon-btn" aria-label={t('community.allGroups')} title={t('community.allGroups')}>
          <Icon name="arrowLeft" size={18} />
        </Link>
        <span className="size-11 shrink-0 overflow-hidden rounded-full">
          <CommunityImage community={community} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-[1.1rem]">{community.name}</h1>
          {community.moderators && (
            <p className="m-0 flex items-center gap-1 text-[0.8rem] text-muted">
              <Icon name="shield" size={12} className="shrink-0" />
              <span className="truncate">{community.moderators}</span>
            </p>
          )}
        </div>
        {community.sensitive && (
          <button type="button" onClick={quickExit} className="btn btn-sm btn-primary shrink-0" aria-label={t('community.quickExit')} title={t('community.quickExit')}>
            <Icon name="close" size={16} />
            <span className="max-sm:hidden">{t('community.quickExit')}</span>
          </button>
        )}
      </header>

      <div ref={ref} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-bg p-3.5">
        {(community.preModerated || community.sensitive) && (
          <p className="m-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 self-center rounded-full bg-surface-2 px-3 py-1 text-center text-[0.78rem] text-muted">
            {community.preModerated && (
              <span className="inline-flex items-center gap-1">
                <Icon name="eyeOff" size={12} /> {t('community.everyPostReviewed')}
              </span>
            )}
            {community.sensitive && <span>{t('community.extraPrivacy')}</span>}
          </p>
        )}
        {api.postsStatus === 'error' && (
          <div className="m-auto flex flex-col items-center gap-2 text-center" role="alert">
            <p className="m-0">{t('community.postsError')}</p>
            <button type="button" className="btn btn-sm btn-ghost" onClick={api.retryPosts}>
              <Icon name="refresh" size={16} /> {t('learn.tryAgain')}
            </button>
          </div>
        )}
        {api.postsStatus === 'ready' && items.length === 0 && <p className="m-auto text-center text-muted">{t('community.noPosts')}</p>}
        {items.map(({ post, reply }) => (
          <ChatMessage key={reply?.id ?? post.id} post={post} reply={reply} api={api} onReply={(p) => setReplyToId(p.id)} />
        ))}
      </div>

      <Composer
        alias={api.myName ?? ''}
        placeholder={t(replyTo ? 'community.replyPlaceholder' : 'community.composerPlaceholder')}
        submitLabel={t(replyTo ? 'community.reply' : 'community.post')}
        replyTo={replyTo}
        onCancelReply={() => setReplyToId(null)}
        onSubmit={async (text) => {
          stick()
          const sent = await (replyTo ? api.addReply(replyTo.id, text) : api.addPost(text))
          if (sent) setReplyToId(null)
          return sent
        }}
      />
    </section>
  )
}
