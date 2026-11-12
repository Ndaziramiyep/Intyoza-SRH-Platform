import type { ApiUser } from '@intyoza/shared/api/client'
import type { TKey } from '@intyoza/shared/i18n/translations'
import type { StaffRole } from '@intyoza/shared/learn/courses/types'
import type { IconName } from '../../components/Icon'
import { LEARN_SOURCE } from '../../lib/learn/courseClient'

// Who may open which Learning Hub staff page. This only decides what the screens show: the backend
// checks the role again on every staff endpoint.

const API_ROLES: Partial<Record<NonNullable<ApiUser['role']>, StaffRole>> = {
  ADMIN: 'admin',
  HEALTH_REVIEWER: 'health_reviewer',
  TRANSLATOR: 'translator',
}

const STAFF_ROLES: StaffRole[] = ['admin', 'health_reviewer', 'translator']

/**
 * For trying the staff screens on sample data before the backend has the new roles: in development
 * only, VITE_STAFF_ROLE=admin (or health_reviewer, translator) in .env.local gives that role.
 */
const devRole = (): StaffRole | undefined => {
  const value = import.meta.env.VITE_STAFF_ROLE as string | undefined
  if (!import.meta.env.DEV || LEARN_SOURCE !== 'sample' || !value) return undefined
  return STAFF_ROLES.find((r) => r === value)
}

export function staffRoleOf(user: ApiUser | null): StaffRole | undefined {
  if (!user) return undefined
  return (user.role && API_ROLES[user.role]) || devRole()
}

export type StaffPage = { path: string; label: TKey; icon: IconName; roles: StaffRole[] }

/** The staff navigation, in order. The first page a role may open is its home. */
export const STAFF_PAGES: StaffPage[] = [
  { path: 'learn/courses', label: 'staff.nav.courses', icon: 'book', roles: ['admin'] },
  { path: 'learn/categories', label: 'staff.nav.categories', icon: 'menu', roles: ['admin'] },
  { path: 'reviews', label: 'staff.nav.reviews', icon: 'shield', roles: ['admin', 'health_reviewer'] },
  { path: 'translations', label: 'staff.nav.translations', icon: 'globe', roles: ['admin', 'translator'] },
  { path: 'reports', label: 'staff.nav.reports', icon: 'spark', roles: ['admin'] },
]

export const pagesFor = (role: StaffRole) => STAFF_PAGES.filter((p) => p.roles.includes(role))
