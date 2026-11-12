import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ApiCommunityComment, type ApiCommunityPost, type ApiCommunitySpace, type IntyozaApi } from '../api/client'
import type { Lang } from '../i18n/translations'
import { RULES_VERSION } from './data'
import { communityFromApi, postFromApi } from './fromApi'
import { aliasFromId } from './moderation'
import type { CommunityStore } from './store'
import type { MemberState, ReportReason } from './types'

const REFRESH_MS = 20_000

type Status = 'loading' | 'ready' | 'error'
type LoadedPost = { post: ApiCommunityPost; comments: ApiCommunityComment[] }

/**
 * Groups, posts and comments from the backend. The backend does not record who joined a group or
 * who accepted the rules, so those stay on this device, as does hiding a post someone has reported.
 */
export function useLiveCommunity(client: IntyozaApi, store: CommunityStore, lang: Lang, groupId?: string) {
  const [member, setMember] = useState<MemberState>(store.loadMember)
  const [me, setMe] = useState<{ id: string; alias: string | null } | null>(null)
  const [spaces, setSpaces] = useState<ApiCommunitySpace[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [loaded, setLoaded] = useState<LoadedPost[]>([])
  const [postsStatus, setPostsStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)
  const latestLoad = useRef(0)

  useEffect(() => store.saveMember(member), [store, member])

  // The community needs an account: without one these calls fail with LOGIN_REQUIRED (status 'error').
  // The groups load again when the language changes.
  useEffect(() => {
    let active = true
    let userId: string | null = null
    client
      .communityUser()
      .then((user) => {
        userId = user.id
        if (active) setMe({ id: user.id, alias: user.alias ?? null })
        return client.communitySpaces()
      })
      .then((found) => {
        if (!active) return
        setSpaces(found)
        setStatus('ready')
        // Joining is only remembered on this device (the backend has no membership). Groups where this
        // account has already posted count as joined too, so they follow the person to any device.
        const me = userId
        void Promise.all(
          found
            .filter((s) => s._count.posts > 0)
            .map((s) => client.communityPosts(s.id).then((posts) => (posts.some((p) => p.userId === me) ? s.id : null), () => null)),
        ).then((ids) => {
          const postedIn = ids.filter((id): id is string => id !== null)
          if (!active || postedIn.length === 0) return
          setMember((m) => (postedIn.every((id) => m.joined.includes(id)) ? m : { ...m, joined: [...new Set([...m.joined, ...postedIn])] }))
        })
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [client, lang, attempt])

  const joined = Boolean(groupId && member.joined.includes(groupId))

  const loadPosts = useCallback(async () => {
    if (!groupId) return
    const load = ++latestLoad.current
    try {
      const posts = await client.communityPosts(groupId)
      const next = await Promise.all(
        posts.map(async (post) => ({ post, comments: post._count.comments > 0 ? await client.communityComments(post.id) : [] })),
      )
      if (load !== latestLoad.current) return
      setLoaded(next)
      setPostsStatus('ready')
    } catch {
      // A failed refresh keeps what is already on screen.
      if (load === latestLoad.current) setPostsStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [client, groupId])

  // Messages are only fetched once someone is in the group, then kept fresh while the page is visible.
  useEffect(() => {
    if (!joined || status !== 'ready') return
    void loadPosts()
    const timer = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) void loadPosts()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [joined, status, loadPosts])

  const communities = useMemo(() => spaces.map(communityFromApi), [spaces])
  const moderatorId = communities.find((c) => c.id === groupId)?.moderatorId
  const myId = me?.id ?? null
  const posts = useMemo(
    () => loaded.map(({ post, comments }) => postFromApi(post, comments, myId, moderatorId)),
    [loaded, myId, moderatorId],
  )

  const retry = useCallback(() => {
    setStatus('loading')
    setAttempt((a) => a + 1)
  }, [])

  const retryPosts = useCallback(() => {
    setPostsStatus('loading')
    void loadPosts()
  }, [loadPosts])

  const acceptRules = useCallback(() => setMember((m) => ({ ...m, rulesAccepted: RULES_VERSION })), [])
  const join = useCallback(
    (id: string) => setMember((m) => (m.joined.includes(id) ? m : { ...m, joined: [...m.joined, id] })),
    [],
  )
  const leave = useCallback((id: string) => setMember((m) => ({ ...m, joined: m.joined.filter((x) => x !== id) })), [])

  /** These return whether it was saved, so what someone wrote is kept if it was not. */
  const addPost = useCallback(
    async (text: string) => {
      if (!groupId) return false
      try {
        await client.createCommunityPost(groupId, text)
      } catch {
        return false
      }
      await loadPosts()
      return true
    },
    [client, groupId, loadPosts],
  )

  const addReply = useCallback(
    async (postId: string, text: string) => {
      try {
        await client.createCommunityComment(postId, text)
      } catch {
        return false
      }
      await loadPosts()
      return true
    },
    [client, loadPosts],
  )

  const report = useCallback(
    async (postId: string, reason: ReportReason) => {
      try {
        await client.reportCommunityPost(postId, reason)
      } catch {
        return false
      }
      setMember((m) => (m.reported.includes(postId) ? m : { ...m, reported: [...m.reported, postId] }))
      return true
    },
    [client],
  )

  return {
    member,
    /** The name others see. Null until the session has loaded. */
    myName: me ? (me.alias ?? aliasFromId(me.id)) : null,
    rulesAccepted: member.rulesAccepted === RULES_VERSION,
    communities,
    status,
    retry,
    posts,
    postsStatus,
    retryPosts,
    acceptRules,
    join,
    leave,
    addPost,
    addReply,
    report,
  }
}

export type LiveCommunityApi = ReturnType<typeof useLiveCommunity>
