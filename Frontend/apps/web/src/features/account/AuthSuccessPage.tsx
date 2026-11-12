import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { useAccount } from './context'

/** Where Google sign-in comes back to: /auth/success?token=… */
export function AuthSuccessPage() {
  const { t } = useLanguage()
  const { completeGoogleLogin } = useAccount()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [failed, setFailed] = useState(!token)
  const started = useRef(false)

  useEffect(() => {
    // Once only, even when React runs effects twice in development.
    if (!token || started.current) return
    started.current = true
    completeGoogleLogin(token).then(
      () => navigate('/dashboard', { replace: true }),
      () => setFailed(true),
    )
  }, [token, completeGoogleLogin, navigate])

  return (
    <section className="container grid min-h-[50vh] place-items-center py-16">
      <div className="card stagger w-full max-w-[420px] p-8 text-center">
        {failed ? (
          <>
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Icon name="alert" size={22} />
            </span>
            <p className="m-0 mb-5">{t('auth.googleFailed')}</p>
            <Link to="/login" className="btn btn-primary">
              {t('account.loginSubmit')}
            </Link>
          </>
        ) : (
          <>
            <span className="spinner mx-auto mb-4 block size-10" aria-hidden="true" />
            <p className="m-0" role="status">
              {t('auth.googleWorking')}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
