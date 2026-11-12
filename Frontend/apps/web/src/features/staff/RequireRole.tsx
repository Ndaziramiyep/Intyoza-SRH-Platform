import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { StaffRole } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { RequireAccount } from '../account/RequireAccount'
import { useAccount } from '../account/context'
import { PageSkeleton } from '../learn/courses/ui'
import { staffRoleOf } from './roles'

/**
 * Shows `children` to signed-in staff with one of `roles`. Guests are asked to log in; signed-in
 * people without the role see a calm "no access" page, never the content.
 */
export function RequireRole({ roles, children }: { roles: StaffRole[]; children: ReactNode }) {
  return (
    <RequireAccount title="staff.loginTitle" text="staff.loginText">
      <RoleCheck roles={roles}>{children}</RoleCheck>
    </RequireAccount>
  )
}

function RoleCheck({ roles, children }: { roles: StaffRole[]; children: ReactNode }) {
  const { t } = useLanguage()
  const { user } = useAccount()

  // The profile (with the role) loads once after sign-in.
  if (!user) {
    return (
      <div className="container py-16">
        <PageSkeleton label={t('common.loading')} />
      </div>
    )
  }

  const role = staffRoleOf(user)
  if (role && roles.includes(role)) return children

  return (
    <section className="container grid place-items-center py-16 max-sm:py-10">
      <div className="card w-full max-w-[520px] p-9 text-center max-sm:px-5" role="alert">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-[20px] bg-surface-2 text-muted">
          <Icon name="lock" size={28} />
        </span>
        <h1 className="m-0 font-display text-[clamp(1.4rem,3.6vw,1.8rem)]">{t('staff.noAccessTitle')}</h1>
        <p className="mx-auto mt-2 mb-6 max-w-[42ch] text-muted">{t('staff.noAccessText')}</p>
        <Link to="/" className="btn btn-outline">
          <Icon name="arrowLeft" size={16} /> {t('staff.backToSite')}
        </Link>
      </div>
    </section>
  )
}
