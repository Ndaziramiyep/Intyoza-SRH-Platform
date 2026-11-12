import type { UserProfile } from '@intyoza/shared/chat/types'
import type { LearnClient, LearnStaffClient } from '@intyoza/shared/learn/courses/client'
import { ageGroupOf } from '@intyoza/shared/learn/courses/helpers'
import { createHttpLearnClient, createHttpStaffClient } from '@intyoza/shared/learn/courses/httpClient'
import { createSampleLearnClient } from '@intyoza/shared/learn/courses/sampleClient'
import { createSampleStaffClient } from '@intyoza/shared/learn/courses/sampleStaffClient'
import { loadAccount } from '../account'
import { api } from '../api'
import { preferenceStorage } from '../privacy/consent'

// Where the Learning Hub courses come from. Until the backend has the /api/v1/learn endpoints the
// screens run on sample data; set VITE_LEARN_SOURCE=api (in .env.local) to use the backend instead.
// No screen changes between the two.

export const LEARN_SOURCE: 'api' | 'sample' = import.meta.env.VITE_LEARN_SOURCE === 'api' ? 'api' : 'sample'

const accountKey = () => {
  const account = loadAccount()
  return account?.mode === 'account' ? account.user.id : 'guest'
}

// The age band saved with the profile when the learner signs in or edits their profile (lib/account.ts).
const savedAgeGroup = () => ageGroupOf(preferenceStorage.get<UserProfile>('intyoza.profile')?.ageBand)

export const learnClient: LearnClient =
  LEARN_SOURCE === 'api'
    ? createHttpLearnClient(api)
    : createSampleLearnClient({
        // Progress follows the "remember preferences" choice, and is wiped by "clear my data".
        store: preferenceStorage,
        userKey: accountKey,
        ageGroup: savedAgeGroup,
      })

export const staffClient: LearnStaffClient =
  LEARN_SOURCE === 'api'
    ? createHttpStaffClient(api)
    : createSampleStaffClient({
        // Staff edits stay in this browser, kept with the other preferences.
        store: preferenceStorage,
        actor: () => {
          const account = loadAccount()
          return account?.mode === 'account' ? account.user.alias || 'Staff member' : 'Staff member'
        },
      })
