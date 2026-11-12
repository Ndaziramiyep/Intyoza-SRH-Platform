import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import { Icon } from '../../components/Icon'
import { LanguageSwitch } from '../../components/LanguageSwitch'
import { useLanguage } from '../../i18n/context'
import { quickExit } from '../../lib/privacy/consent'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { Divider, GoogleButton, LoginForm, RegisterForm } from './AuthForms'
import { useAuthNext } from './authNext'
import { useAccount } from './context'

export type AuthMode = 'login' | 'register'

/**
 * /login and /register: one calm page with a single card. A switch at the top of the card moves
 * between the two (each has its own address, so either can be linked to), and the form slides in.
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const { t } = useLanguage()
  const { account } = useAccount()
  const { next, query } = useAuthNext()
  const [params] = useSearchParams()
  const registering = mode === 'register'

  if (account?.mode === 'account') return <Navigate to={next} replace />
  // Older links opened sign up with /login?mode=register.
  if (!registering && params.get('mode') === 'register') return <Navigate to={`/register${query}`} replace />

  return (
    <main className="auth-bg relative isolate flex min-h-svh flex-col overflow-hidden px-[clamp(16px,4vw,40px)] py-5">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <span className="auth-glow auth-glow-a" />
        <span className="auth-glow auth-glow-b" />
        <span className="auth-glow auth-glow-c" />
        <span className="auth-dots" />
      </div>

      {/* On wide screens the bar floats, so the card can be centred in the whole height. */}
      <header className="relative z-10 flex items-center justify-between gap-3 xl:absolute xl:inset-x-[clamp(16px,4vw,40px)] xl:top-5">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle className="icon-btn bg-surface" />
          {/* The same safety button as on every other page: leaves the site at once. */}
          <button
            type="button"
            className="btn btn-sm border-fg bg-surface text-fg hover:bg-fg hover:text-bg max-sm:px-2.5"
            onClick={quickExit}
            aria-label={t('privacy.quickExit')}
          >
            <Icon name="close" size={16} /> <span className="max-[820px]:hidden">{t('privacy.quickExit')}</span>
          </button>
        </div>
      </header>

      <div className="my-auto grid w-full place-items-center py-6 xl:py-4">
        <section
          className={`auth-card w-full rounded-[28px] border border-line bg-surface px-[clamp(20px,4vw,36px)] py-[clamp(20px,3vw,30px)] transition-[max-width] duration-500 ease-out ${registering ? 'max-w-[1100px]' : 'max-w-[440px]'}`}
          aria-labelledby="auth-title"
        >
          {/* Log in | Sign up, with a highlight that slides between them. */}
          <nav aria-label={t('account.loginOrRegister')} className="relative mb-4 grid grid-cols-2 rounded-full bg-surface-2 p-1">
            <span
              className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-surface shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--ink)_25%,transparent)] transition-transform duration-300 ease-out ${registering ? 'translate-x-full' : ''}`}
              aria-hidden="true"
            />
            {(['login', 'register'] as const).map((m) => (
              <Link
                key={m}
                to={`/${m}${query}`}
                replace
                aria-current={mode === m ? 'page' : undefined}
                className="relative z-10 rounded-full py-2 text-center text-[0.92rem] font-semibold text-muted no-underline transition-colors aria-[current=page]:text-fg"
              >
                {m === 'login' ? t('account.loginSubmit') : t('auth.signUp')}
              </Link>
            ))}
          </nav>

          <div key={mode} className={registering ? 'slide-from-right' : 'slide-from-left'}>
            <h1 id="auth-title" className="m-0 text-center font-display text-[clamp(1.5rem,3vw,1.85rem)] leading-tight font-bold tracking-tight">
              {registering ? t('auth.registerHeading') : t('auth.welcomeBack')}
            </h1>
            <p className="mt-1 mb-4 text-center text-[0.95rem] text-muted">{registering ? t('auth.registerSub') : t('auth.loginSub')}</p>

            <GoogleButton />
            <div className="my-3">
              <Divider />
            </div>

            {registering ? <RegisterForm /> : <LoginForm />}
          </div>

        </section>

        <p className="mt-4 mb-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-[0.85rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="shield" size={15} className="text-brand" /> {t('auth.footNote')}
          </span>
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-muted no-underline hover:text-brand">
            <Icon name="eyeOff" size={15} /> {t('account.anonInstead')}
          </Link>
        </p>
      </div>
    </main>
  )
}
