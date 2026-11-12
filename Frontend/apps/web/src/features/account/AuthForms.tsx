import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiLanguage, type ApiLanguage } from '@intyoza/shared/api/client'
import { AGE_OPTIONS, DISTRICTS, GENDER_OPTIONS } from '@intyoza/shared/chat/about'
import type { AgeBand, Gender, UserProfile } from '@intyoza/shared/chat/types'
import type { IconName } from '@intyoza/shared/icons'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { api } from '../../lib/api'
import { preferenceStorage } from '../../lib/privacy/consent'
import { useAuthNext } from './authNext'
import { useAccount } from './context'

const label = 'mb-1.5 block text-[0.9rem] font-semibold'
const control =
  'h-11 w-full rounded-2xl border border-transparent bg-surface-2 text-[0.98rem] text-fg transition-[border-color,background-color,box-shadow] placeholder:text-muted/80 focus:border-brand focus:bg-surface focus:shadow-[0_0_0_4px_var(--brand-soft)] focus:outline-none'
// Inputs leave room for the icon; drop-downs are tighter so long choices fit four across.
const input = `${control} pr-4 pl-12`
const select = `${control} appearance-none truncate pr-9 pl-11 text-[0.92rem]`


function errorKey(err: unknown, registering: boolean): TKey {
  if (!(err instanceof ApiError)) return 'account.errorGeneric'
  if (err.status === 0) return 'account.errorNetwork'
  if (err.status === 401) return 'account.errorCredentials'
  if (err.status === 409) return 'account.errorEmailInUse'
  if (registering && err.status === 404) return 'account.errorUnavailable'
  return 'account.errorGeneric'
}

/** 0-3: length, then mixing letters with numbers or symbols. */
function strength(password: string) {
  if (password.length < 8) return password ? 1 : 0
  const kinds = [/[a-z]/i, /\d/, /[^a-z\d]/i].filter((re) => re.test(password)).length
  return kinds >= 3 || (kinds === 2 && password.length >= 12) ? 3 : 2
}

const STRENGTH: { key: TKey; color: string }[] = [
  { key: 'account.passwordHint', color: 'bg-line' },
  { key: 'auth.strengthWeak', color: 'bg-[#d9534f]' },
  { key: 'auth.strengthFair', color: 'bg-[#e0a526]' },
  { key: 'auth.strengthStrong', color: 'bg-[#2e9e6a]' },
]

function Field({ id, text, icon, children, trailing }: { id: string; text: string; icon: IconName; children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className={label} htmlFor={id}>
        {text}
      </label>
      <div className="relative">
        <Icon name={icon} size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        {children}
        {trailing}
      </div>
    </div>
  )
}

function Chevron() {
  return <Icon name="chevronRight" size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 rotate-90 text-muted" />
}

function PasswordInput(props: {
  id: string
  text: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  minLength?: number
  describedBy?: string
}) {
  const { t } = useLanguage()
  const [shown, setShown] = useState(false)
  return (
    <Field
      id={props.id}
      text={props.text}
      icon="lock"
      trailing={
        <button
          type="button"
          className={`absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-xl hover:bg-brand-soft ${shown ? 'text-brand' : 'text-muted'}`}
          aria-pressed={shown}
          aria-controls={props.id}
          aria-label={shown ? t('auth.hide') : t('auth.show')}
          onClick={() => setShown((s) => !s)}
        >
          <Icon name="eyeOff" size={19} />
        </button>
      }
    >
      <input
        id={props.id}
        className={`${input} pr-14`}
        type={shown ? 'text' : 'password'}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        required
        minLength={props.minLength}
        aria-describedby={props.describedBy}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </Field>
  )
}

function ErrorNote({ error }: { error: { key: TKey; at: number } | null }) {
  const { t } = useLanguage()
  if (!error) return null
  return (
    <p
      key={error.at}
      role="alert"
      className="shake m-0 flex items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,#d9534f_12%,var(--surface))] px-4 py-3.5 text-[0.95rem]"
    >
      <Icon name="alert" size={19} className="shrink-0 text-[#c0392b]" />
      <span>{t(error.key)}</span>
    </p>
  )
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="btn btn-primary h-12 w-full rounded-full text-[1rem] shadow-[0_14px_30px_-14px_var(--brand)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
    >
      {busy && <span className="spinner size-5 border-2" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function GoogleButton() {
  const { t } = useLanguage()
  return (
    <a
      href={api.googleLoginUrl()}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface font-semibold text-fg no-underline transition-colors hover:border-brand hover:bg-brand-soft"
    >
      <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {t('auth.google')}
    </a>
  )
}

export function Divider() {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-3 text-[0.85rem] text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      {t('auth.or')}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

export function LoginForm() {
  const { t } = useLanguage()
  const { login } = useAccount()
  const navigate = useNavigate()
  const { next } = useAuthNext()
  const ids = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ key: TKey; at: number } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError({ key: errorKey(err, false), at: Date.now() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(e) => void submit(e)}>
      <Field id={`${ids}-email`} text={t('account.email')} icon="mail">
        <input
          id={`${ids}-email`}
          className={input}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('auth.emailPlaceholder')}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <PasswordInput
        id={`${ids}-password`}
        text={t('account.password')}
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <ErrorNote error={error} />
      <SubmitButton busy={busy}>{t('account.loginSubmit')}</SubmitButton>
    </form>
  )
}

/** Every field POST /auth/register takes, two per row so the form stays short. */
export function RegisterForm() {
  const { t, lang } = useLanguage()
  const { register } = useAccount()
  const navigate = useNavigate()
  const { next } = useAuthNext()
  const ids = useId()
  // Age and sex start from what a guest already gave in the chat.
  const saved = preferenceStorage.get<UserProfile>('intyoza.profile')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ageBand, setAgeBand] = useState<AgeBand>(saved?.ageBand ?? 'UNKNOWN')
  const [gender, setGender] = useState<Gender>(saved?.gender ?? 'PREFER_NOT_TO_SAY')
  const [district, setDistrict] = useState(saved?.district ?? '')
  const [language, setLanguage] = useState<ApiLanguage>(apiLanguage(lang))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ key: TKey; at: number } | null>(null)
  const level = strength(password)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError({ key: 'auth.passwordMismatch', at: Date.now() })
      return
    }
    setBusy(true)
    setError(null)
    try {
      await register({ email: email.trim(), password, ageBand, gender, district: district || undefined, language })
      navigate(next, { replace: true })
    } catch (err) {
      setError({ key: errorKey(err, true), at: Date.now() })
    } finally {
      setBusy(false)
    }
  }

  return (
    // Wide screens: email and both passwords in one row, then the four optional fields in one row.
    <form className="grid gap-3" onSubmit={(e) => void submit(e)}>
      <div className="grid gap-x-3.5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <Field id={`${ids}-email`} text={t('account.email')} icon="mail">
            <input
              id={`${ids}-email`}
              className={input}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('auth.emailPlaceholder')}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
        <PasswordInput
          id={`${ids}-password`}
          text={t('account.password')}
          placeholder={t('auth.passwordNewPlaceholder')}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          describedBy={`${ids}-strength`}
        />
        <PasswordInput
          id={`${ids}-confirm`}
          text={t('auth.confirmPassword')}
          placeholder={t('auth.confirmPlaceholder')}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      <div className="-mt-0.5 flex items-center gap-3">
        <div className="strength-bar grid w-28 shrink-0 grid-cols-3 gap-1" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 rounded-full ${n <= level ? STRENGTH[level].color : 'bg-line'}`} />
          ))}
        </div>
        <p id={`${ids}-strength`} className="m-0 text-[0.82rem] text-muted" aria-live="polite">
          {t(STRENGTH[level].key)}
        </p>
      </div>

      <div className="grid gap-x-3.5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`${ids}-age`} text={t('ask.ageRange')} icon="clock" trailing={<Chevron />}>
          <select id={`${ids}-age`} className={select} value={ageBand} onChange={(e) => setAgeBand(e.target.value as AgeBand)}>
            {AGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label ?? t('ask.ratherNotSay')}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${ids}-gender`} text={t('profile.gender')} icon="user" trailing={<Chevron />}>
          <select id={`${ids}-gender`} className={select} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${ids}-district`} text={t('profile.district')} icon="pin" trailing={<Chevron />}>
          <select id={`${ids}-district`} className={select} value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">{t('ask.ratherNotSay')}</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${ids}-language`} text={t('auth.languageShort')} icon="globe" trailing={<Chevron />}>
          <select id={`${ids}-language`} className={select} value={language} onChange={(e) => setLanguage(e.target.value as ApiLanguage)}>
            <option value="RW">Kinyarwanda</option>
            <option value="EN">English</option>
          </select>
        </Field>
      </div>

      <ErrorNote error={error} />
      <div className="mx-auto mt-1 w-full max-w-[420px]">
        <SubmitButton busy={busy}>{t('account.registerSubmit')}</SubmitButton>
      </div>
    </form>
  )
}
