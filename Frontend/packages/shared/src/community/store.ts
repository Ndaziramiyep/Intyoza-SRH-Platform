import type { KeyValueStore } from '../storage'
import { SEED_POSTS } from './data'
import { randomAlias } from './moderation'
import type { MemberState, Post } from './types'

// Local community store. Posts written here are kept on this device only,
// until the backend community API is available to share them with others.

const MEMBER_KEY = 'intyoza.community.member'
const POSTS_KEY = 'intyoza.community.posts'

export type CommunityStore = ReturnType<typeof createCommunityStore>

export function createCommunityStore(storage: KeyValueStore) {
  return {
    loadMember(): MemberState {
      return (
        storage.get<MemberState>(MEMBER_KEY) ?? {
          alias: randomAlias(),
          rulesAccepted: null,
          joined: [],
          supported: [],
          reported: [],
        }
      )
    },

    saveMember(member: MemberState) {
      storage.set(MEMBER_KEY, member)
    },

    /** The user's own posts and replies, merged on top of the seed posts. */
    loadPosts(): Post[] {
      const own = storage.get<Post[]>(POSTS_KEY) ?? []
      const ownIds = new Set(own.map((p) => p.id))
      return [...own, ...SEED_POSTS.filter((p) => !ownIds.has(p.id))]
    },

    savePosts(posts: Post[]) {
      // Seed posts are only stored once the user has interacted with them (e.g. replied).
      const seedById = new Map(SEED_POSTS.map((p) => [p.id, p]))
      const changed = posts.filter((p) => !seedById.has(p.id) || JSON.stringify(seedById.get(p.id)) !== JSON.stringify(p))
      storage.set(POSTS_KEY, changed)
    },

    clear() {
      storage.remove(MEMBER_KEY)
      storage.remove(POSTS_KEY)
    },
  }
}
