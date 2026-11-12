import { useCallback, useEffect, useState } from 'react'
import { RULES_VERSION } from './data'
import { randomAlias } from './moderation'
import type { CommunityStore } from './store'
import type { Community, MemberState, Post } from './types'

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** Community state for one app, saved through that app's store. */
export function useCommunity(store: CommunityStore) {
  const [member, setMember] = useState<MemberState>(store.loadMember)
  const [posts, setPosts] = useState<Post[]>(store.loadPosts)

  useEffect(() => store.saveMember(member), [store, member])
  useEffect(() => store.savePosts(posts), [store, posts])

  const rulesAccepted = member.rulesAccepted === RULES_VERSION

  const acceptRules = useCallback(() => setMember((m) => ({ ...m, rulesAccepted: RULES_VERSION })), [])
  const newAlias = useCallback(() => setMember((m) => ({ ...m, alias: randomAlias() })), [])
  const setAlias = useCallback((alias: string) => setMember((m) => ({ ...m, alias })), [])

  const join = useCallback(
    (id: string) => setMember((m) => (m.joined.includes(id) ? m : { ...m, joined: [...m.joined, id] })),
    [],
  )
  const leave = useCallback((id: string) => setMember((m) => ({ ...m, joined: m.joined.filter((x) => x !== id) })), [])

  const addPost = useCallback(
    (community: Community, text: string) => {
      const post: Post = {
        id: newId(),
        communityId: community.id,
        author: member.alias,
        isMine: true,
        text,
        createdAt: new Date().toISOString(),
        status: community.preModerated ? 'pending' : 'published',
        replies: [],
        support: 0,
      }
      setPosts((p) => [post, ...p])
    },
    [member.alias],
  )

  const addReply = useCallback(
    (community: Community, postId: string, text: string) => {
      const reply = {
        id: newId(),
        author: member.alias,
        isMine: true,
        text,
        createdAt: new Date().toISOString(),
        pending: community.preModerated,
      }
      setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, reply] } : p)))
    },
    [member.alias],
  )

  const toggleSupport = useCallback(
    (postId: string) => {
      const supported = member.supported.includes(postId)
      setMember((m) => ({
        ...m,
        supported: supported ? m.supported.filter((x) => x !== postId) : [...m.supported, postId],
      }))
      setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, support: p.support + (supported ? -1 : 1) } : p)))
    },
    [member.supported],
  )

  const report = useCallback((postId: string) => {
    // A real report goes to the moderation queue; here the post is hidden for the reporter.
    setMember((m) => (m.reported.includes(postId) ? m : { ...m, reported: [...m.reported, postId] }))
  }, [])

  const deletePost = useCallback((postId: string) => setPosts((ps) => ps.filter((p) => p.id !== postId)), [])

  return {
    member,
    posts,
    rulesAccepted,
    acceptRules,
    newAlias,
    setAlias,
    join,
    leave,
    addPost,
    addReply,
    toggleSupport,
    report,
    deletePost,
  }
}

export type CommunityApi = ReturnType<typeof useCommunity>
