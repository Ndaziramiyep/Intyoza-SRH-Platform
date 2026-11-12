import type { IconName } from '../icons'

export type Community = {
  id: string
  name: string
  tagline: string
  description: string
  icon: IconName
  tone: 'brand' | 'accent' | 'violet' | 'sun'
  /** Posts are checked by a moderator before others can see them. */
  preModerated: boolean
  /** Extra protections: quick exit, no previews of posts on the list page. */
  sensitive: boolean
  moderators: string
  /** From the backend: the group's own picture and its moderator. */
  imageUrl?: string
  moderatorId?: string
}

export type Reply = {
  id: string
  author: string
  isModerator?: boolean
  text: string
  createdAt: string
  isMine?: boolean
  /** Waiting for moderator review (pre-moderated groups). */
  pending?: boolean
}

export type PostStatus = 'published' | 'pending'

export type Post = {
  id: string
  communityId: string
  author: string
  isModerator?: boolean
  isMine?: boolean
  isExample?: boolean
  text: string
  createdAt: string
  status: PostStatus
  replies: Reply[]
  support: number
}

export type MemberState = {
  alias: string
  rulesAccepted: string | null
  joined: string[]
  supported: string[]
  reported: string[]
}

export type ReportReason = 'harassment' | 'personal-info' | 'harmful-advice' | 'someone-in-danger' | 'spam' | 'other'
