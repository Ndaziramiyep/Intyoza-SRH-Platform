import { createCommunityStore } from '@intyoza/shared/community/store'
import { storage } from '../storage'

/** Community posts and membership, kept on this browser. */
export const communityStore = createCommunityStore(storage)
