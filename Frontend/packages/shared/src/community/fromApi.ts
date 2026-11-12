import type { ApiCommunityComment, ApiCommunityPost, ApiCommunitySpace } from '../api/client'
import { aliasFromId } from './moderation'
import type { Community, Post, Reply } from './types'

/**
 * The backend publishes posts straight away and has no sensitive flag, so neither is claimed here:
 * screens must not say a post waits for review when it does not.
 */
export function communityFromApi(space: ApiCommunitySpace): Community {
  return {
    id: space.id,
    name: space.name,
    tagline: space.description,
    description: space.description,
    icon: 'users',
    tone: 'brand',
    preModerated: false,
    sensitive: false,
    moderators: space.moderator ? (space.moderator.alias ?? aliasFromId(space.moderator.id)) : '',
    imageUrl: space.imageUrl ?? undefined,
    moderatorId: space.moderatorId ?? undefined,
  }
}

const authorOf = (user: { id: string; alias: string | null }) => user.alias ?? aliasFromId(user.id)

function replyFromApi(comment: ApiCommunityComment, me: string | null, moderatorId?: string): Reply {
  return {
    id: comment.id,
    author: authorOf(comment.user),
    isModerator: comment.userId === moderatorId,
    isMine: comment.userId === me,
    text: comment.content,
    createdAt: comment.createdAt,
  }
}

export function postFromApi(post: ApiCommunityPost, comments: ApiCommunityComment[], me: string | null, moderatorId?: string): Post {
  return {
    id: post.id,
    communityId: post.spaceId,
    author: authorOf(post.user),
    isModerator: post.userId === moderatorId,
    isMine: post.userId === me,
    text: post.content,
    createdAt: post.createdAt,
    status: 'published',
    replies: comments.map((c) => replyFromApi(c, me, moderatorId)),
    support: 0,
  }
}
