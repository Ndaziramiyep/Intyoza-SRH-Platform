import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ApiError, type ApiCommunitySpace, type ApiLanguage, type ApiReferral, type ApiUser, type ReferralStatus } from '@intyoza/shared/api/client'
import { AGE_OPTIONS, DISTRICTS, GENDER_OPTIONS } from '@intyoza/shared/chat/about'
import type { AgeBand, Gender } from '@intyoza/shared/chat/types'
import type { IconName } from '@intyoza/shared/icons'
import { fill, type TKey } from '@intyoza/shared/i18n/translations'
import { coursePercent, courseState } from '@intyoza/shared/learn/courses/helpers'
import type { CourseSummary } from '@intyoza/shared/learn/courses/types'
import { mythOfTheDay } from '@intyoza/shared/myths/match'
import { localizeMyth } from '@intyoza/shared/myths/translations'
import { useMyths } from '@intyoza/shared/myths/useMyths'
import { Icon } from '../../components/Icon'
import { pick, useLanguage } from '../../i18n/context'
import { api } from '../../lib/api'
import { chatStore } from '../../lib/chat/chatStore'
import { communityStore } from '../../lib/community/store'
import { learnClient } from '../../lib/learn/courseClient'
import { useChatWidget } from '../ask/chatWidgetContext'
import { ProgressBar } from '../learn/courses/ui'
import { displayName } from '../../lib/account'
import { useAccount } from './context'

const label = 'mb-1.5 block text-[0.85rem] font-semibold'
const chip = 'chip min-h-9 px-3.5 py-1 text-[0.88rem]'
const sectionCard = 'card stagger p-7 max-sm:px-5 max-sm:py-6'

const STATUS: Record<ReferralStatus, { key: TKey; className: string }> = {
  PENDING: { key: 'pro.statusPending', className: 'bg-surface-2 text-fg' },
  CONTACTED: { key: 'pro.statusContacted', className: 'bg-brand-soft text-brand' },
  RESOLVED: { key: 'pro.statusResolved', className: 'bg-[color-mix(in_srgb,#2e9e6a_14%,var(--base))] text-[#23784f]' },
  CANCELLED: { key: 'pro.statusCancelled', className: 'bg-surface-2 text-muted line-through' },
}

const TOPICS: TKey[] = ['topic.contraception', 'topic.sti', 'topic.pregnancy', 'topic.menstruation', 'topic.relationships', 'topic.consent']

function Saved({ text }: { text: string }) {
  return (
    <span role="status" className="inline-flex animate-[pop_400ms_ease-out] items-center gap-1 text-[0.88rem] font-semibold text-brand">
      <Icon name="check" size={15} /> {text}
    </span>
  )
}

function ProfileForm({ user }: { user: ApiUser }) {
  const { t } = useLanguage()
  const { updateProfile } = useAccount()
  const [alias, setAlias] = useState(user.alias ?? '')
  const [ageBand, setAgeBand] = useState<AgeBand>(user.ageBand)
  const [gender, setGender] = useState<Gender>(user.gender ?? 'PREFER_NOT_TO_SAY')
  const [district, setDistrict] = useState(user.district ?? '')
  const [language, setLanguage] = useState<ApiLanguage>(user.language)
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | TKey>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('busy')
    try {
      await updateProfile({ ...(alias.trim() ? { alias: alias.trim() } : {}), ageBand, gender, language, ...(district ? { district } : {}) })
      setState('saved')
    } catch (err) {
      setState(err instanceof ApiError && err.status === 409 ? 'account.errorAliasTaken' : err instanceof ApiError && err.status === 0 ? 'account.errorNetwork' : 'account.errorGeneric')
    }
  }

  return (
    <section className={sectionCard} aria-labelledby="profile-title">
      <h2 id="profile-title" className="m-0 font-display text-[1.35rem]">
        {t('account.profileTitle')}
      </h2>
      <p className="mt-1 mb-5 text-muted">{t('account.profileText')}</p>
      <form className="grid gap-5" onSubmit={(e) => void submit(e)}>
        <div>
          <label className={label} htmlFor="profile-alias">
            {t('account.alias')}
          </label>
          <input
            id="profile-alias"
            className="input"
            maxLength={30}
            autoComplete="nickname"
            aria-describedby="profile-alias-hint"
            placeholder="BraveLion"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
          <p id="profile-alias-hint" className="mt-1.5 mb-0 text-[0.8rem] text-muted">
            {t('account.aliasHint')}
          </p>
        </div>

        <fieldset>
          <legend className={label}>{t('ask.ageRange')}</legend>
          <div className="chip-row">
            {AGE_OPTIONS.map((o) => (
              <button key={o.value} type="button" className={chip} aria-pressed={ageBand === o.value} onClick={() => setAgeBand(o.value)}>
                {o.label ?? t('ask.ratherNotSay')}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>{t('profile.gender')}</legend>
          <div className="chip-row">
            {GENDER_OPTIONS.map((o) => (
              <button key={o.value} type="button" className={chip} aria-pressed={gender === o.value} onClick={() => setGender(o.value)}>
                {t(o.label)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="profile-district">
              {t('profile.district')}
            </label>
            <select id="profile-district" className="select" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">{t('ask.ratherNotSay')}</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className={label}>{t('account.language')}</legend>
            <div className="chip-row">
              {(['EN', 'RW'] as const).map((l) => (
                <button key={l} type="button" className={chip} aria-pressed={language === l} onClick={() => setLanguage(l)}>
                  {l === 'EN' ? 'English' : 'Kinyarwanda'}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>
            {state === 'busy' && <span className="spinner size-4 border-2" aria-hidden="true" />}
            {t('profile.save')}
          </button>
          {state === 'saved' && <Saved text={t('profile.saved')} />}
          {state !== 'idle' && state !== 'busy' && state !== 'saved' && (
            <span role="alert" className="shake text-[0.88rem] font-semibold text-[#c0392b]">
              {t(state)}
            </span>
          )}
        </div>
      </form>
    </section>
  )
}

type Referrals = {
  referrals: ApiReferral[] | null
  loadFailed: boolean
  setReferrals: (update: (r: ApiReferral[] | null) => ApiReferral[]) => void
}

function Professionals({ referrals, loadFailed, setReferrals }: Referrals) {
  const { t, lang } = useLanguage()
  const [contact, setContact] = useState('')
  const [topic, setTopic] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState('busy')
    try {
      const created = await api.requestReferral({ contactMethod: contact.trim(), ...(topic.trim() ? { topic: topic.trim() } : {}) })
      setReferrals((r) => [created, ...(r ?? [])])
      setContact('')
      setTopic('')
      setState('sent')
    } catch {
      setState('error')
    }
  }

  const date = (iso: string) => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

  return (
    <section id="professional" className={`${sectionCard} scroll-mt-24`} aria-labelledby="pro-title">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Icon name="phone" size={22} />
        </span>
        <div>
          <h2 id="pro-title" className="m-0 font-display text-[1.35rem]">
            {t('pro.title')}
          </h2>
          <p className="mt-1 mb-0 text-muted">{t('pro.text')}</p>
        </div>
      </div>

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void submit(e)}>
        <div>
          <label className={label} htmlFor="pro-contact">
            {t('pro.contact')}
          </label>
          <input
            id="pro-contact"
            className="input"
            required
            autoComplete="tel"
            placeholder="+250 7XX XXX XXX"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="pro-topic">
            {t('pro.topic')}
          </label>
          <input
            id="pro-topic"
            className="input"
            list="pro-topics"
            maxLength={120}
            placeholder={t('pro.topicPlaceholder')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <datalist id="pro-topics">
            {TOPICS.map((k) => (
              <option key={k} value={t(k)} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={state === 'busy'}>
            {state === 'busy' ? <span className="spinner size-4 border-2" aria-hidden="true" /> : <Icon name="send" size={16} />}
            {t('pro.submit')}
          </button>
          {state === 'sent' && <Saved text={t('pro.sent')} />}
          {state === 'error' && (
            <span role="alert" className="shake text-[0.88rem] font-semibold text-[#c0392b]">
              {t('account.errorGeneric')}
            </span>
          )}
        </div>
      </form>

      <h3 className="mt-7 mb-3 text-base">{t('pro.mine')}</h3>
      {referrals === null && !loadFailed && <span className="spinner block size-6" aria-label={t('community.loading')} />}
      {loadFailed && <p className="m-0 text-muted">{t('account.errorNetwork')}</p>}
      {referrals?.length === 0 && <p className="m-0 text-muted">{t('pro.none')}</p>}
      {referrals && referrals.length > 0 && (
        <ul className="grid gap-2.5">
          {referrals.map((r) => (
            <li key={r.id} className="flex animate-[rise_400ms_ease-out] flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-line px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.topic || t('pro.noTopic')}</span>
                <span className="block text-[0.85rem] text-muted">
                  {r.contactMethod} · {date(r.createdAt)}
                </span>
              </span>
              <span className={`rounded-full px-3 py-1 text-[0.8rem] font-bold ${STATUS[r.status]?.className ?? ''}`}>
                {t(STATUS[r.status]?.key ?? 'pro.statusPending')}
              </span>
              {/* What the health worker handling the request wrote back. */}
              {r.notes && (
                <p className="m-0 mt-1.5 flex w-full items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-[0.88rem]">
                  <Icon name="chat" size={15} className="mt-0.5 shrink-0 text-brand" />
                  <span>
                    <span className="font-semibold">{t('pro.note')}:</span> {r.notes}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type Tab = 'overview' | 'profile' | 'help'

const TABS: { id: Tab; icon: IconName; key: TKey }[] = [
  { id: 'overview', icon: 'home', key: 'dash.overview' },
  { id: 'profile', icon: 'user', key: 'account.profileTitle' },
  { id: 'help', icon: 'phone', key: 'dash.help' },
]

const ACTIONS: { icon: IconName; key: TKey; to?: string }[] = [
  { icon: 'chat', key: 'nav.ask' },
  { icon: 'pin', key: 'nav.services', to: '/services' },
  { icon: 'users', key: 'nav.community', to: '/community' },
  { icon: 'book', key: 'nav.learn', to: '/learn' },
  { icon: 'spark', key: 'nav.myths', to: '/myths' },
]

function greetingKey(): TKey {
  const hour = new Date().getHours()
  return hour < 12 ? 'dash.goodMorning' : hour < 18 ? 'dash.goodAfternoon' : 'dash.goodEvening'
}

/** A number that matters, which also leads to where it comes from. */
function Stat({
  icon,
  value,
  label,
  note,
  onClick,
  to,
}: {
  icon: IconName
  value: number | string
  label: string
  note?: string
  onClick?: () => void
  to?: string
}) {
  const body = (
    <>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
        <Icon name={icon} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[1.75rem] leading-none font-bold">{value}</span>
        <span className="mt-1 block text-[0.88rem] text-muted">{label}</span>
        {note && <span className="block text-[0.78rem] font-semibold text-brand">{note}</span>}
      </span>
      <Icon name="arrowRight" size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand" />
    </>
  )
  const cls = 'card group flex w-full items-center gap-4 p-5 text-left text-fg no-underline transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand'
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  )
}

/** A dashboard panel with a title and an optional link on the right. */
function Panel({ id, title, action, children }: { id: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-6 max-sm:px-5" aria-labelledby={id}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="m-0 font-display text-[1.2rem]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const panelLink = 'inline-flex items-center gap-1 text-[0.88rem] font-semibold text-brand no-underline hover:underline'

/** The groups this person joined, by name (GET /community/spaces), with a way in. */
/**
 * The Safe Space groups and which of them are this person's: joined on this device, or where their
 * account has posted (the backend keeps no membership, so that is what follows them to other devices).
 * Groups found that way are saved as joined, so the Safe Space pages agree.
 */
function useMyGroups(userId: string) {
  const [spaces, setSpaces] = useState<ApiCommunitySpace[] | null>(null)
  const [joined, setJoined] = useState<string[]>(() => communityStore.loadMember().joined)

  useEffect(() => {
    let active = true
    api.communitySpaces().then(
      async (found) => {
        if (!active) return
        setSpaces(found)
        const posted = await Promise.all(
          found
            .filter((s) => s._count.posts > 0)
            .map((s) => api.communityPosts(s.id).then((posts) => (posts.some((p) => p.userId === userId) ? s.id : null), () => null)),
        )
        const member = communityStore.loadMember()
        const ids = [...new Set([...member.joined, ...posted.filter((id): id is string => id !== null)])]
        if (ids.length !== member.joined.length) communityStore.saveMember({ ...member, joined: ids })
        if (active) setJoined(ids)
      },
      () => active && setSpaces([]),
    )
    return () => {
      active = false
    }
  }, [userId])

  return { spaces, joined }
}

function MyGroups({ spaces, joined }: { spaces: ApiCommunitySpace[] | null; joined: string[] }) {
  const { t } = useLanguage()

  const mine = spaces?.filter((s) => joined.includes(s.id)) ?? []
  // Groups to suggest when none are joined yet.
  const suggestions = spaces?.filter((s) => !joined.includes(s.id)).slice(0, 3) ?? []

  return (
    <Panel
      id="dash-groups"
      title={t('dash.myGroups')}
      action={
        <Link to="/community" className={panelLink}>
          {t('dash.seeAll')} <Icon name="arrowRight" size={14} />
        </Link>
      }
    >
      {spaces === null ? (
        <span className="spinner block size-6" aria-label={t('community.loading')} />
      ) : mine.length > 0 ? (
        <ul className="grid gap-2">
          {mine.map((s) => (
            <li key={s.id}>
              <Link
                to={`/community/${s.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-fg no-underline transition-colors hover:border-brand"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon name="users" size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block text-[0.8rem] text-muted">{fill(t('dash.posts'), { n: s._count.posts })}</span>
                </span>
                <span className="text-[0.85rem] font-semibold text-brand">{t('dash.open')}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <p className="mt-0 mb-3 text-muted">{t('dash.noGroups')}</p>
          {suggestions.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <Link to={`/community/${s.id}`} className="chip no-underline">
                    <Icon name="plus" size={14} /> {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link to="/community" className="btn btn-sm btn-primary">
              {t('home.ctaCommunity')}
            </Link>
          )}
        </div>
      )}
    </Panel>
  )
}

/** My learning: the Learning Hub courses in progress, and how many are finished, with certificates. */
function ContinueLearning() {
  const { t, lang } = useLanguage()
  const [learning, setLearning] = useState<{ courses: CourseSummary[]; certificates: number } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([learnClient.courses(), learnClient.certificates()]).then(
      ([courses, certificates]) => active && setLearning({ courses, certificates: certificates.length }),
      // The panel then shows the way into the Learning Hub.
      () => active && setLearning({ courses: [], certificates: 0 }),
    )
    return () => {
      active = false
    }
  }, [])

  const inProgress = (learning?.courses ?? []).filter((c) => courseState(c) === 'in_progress').slice(0, 3)
  const finished = (learning?.courses ?? []).filter((c) => courseState(c) === 'completed').length

  return (
    <Panel
      id="dash-learn"
      title={t('dash.learnTitle')}
      action={
        <Link to="/learn" className={panelLink}>
          {t('dash.seeAll')} <Icon name="arrowRight" size={14} />
        </Link>
      }
    >
      {learning === null ? (
        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-hidden="true" />
      ) : inProgress.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-3">
          {inProgress.map((course) => (
            <li key={course.id}>
              <Link
                to={`/learn/courses/${course.slug}`}
                className="flex h-full flex-col gap-2.5 rounded-2xl bg-surface-2 p-4 text-fg no-underline transition-colors hover:bg-brand-soft"
              >
                <span className="line-clamp-2 text-[0.92rem] leading-snug font-semibold">{pick(course.title, lang)}</span>
                {course.progress && (
                  <span className="mt-auto flex items-center gap-2 text-[0.8rem] font-semibold text-brand">
                    <ProgressBar
                      value={coursePercent(course)}
                      label={fill(t('courses.progress'), { done: course.progress.lessonsDone, total: course.progress.lessonsTotal })}
                      className="h-1.5 flex-1 bg-surface"
                    />
                    {course.progress.lessonsDone}/{course.progress.lessonsTotal}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4">
          <p className="m-0 max-w-[46ch] text-[0.92rem] text-muted">{t('dash.learnEmpty')}</p>
          <Link to="/learn" className="btn btn-sm btn-primary">
            {t('dash.learnStart')}
          </Link>
        </div>
      )}
      {learning && (finished > 0 || learning.certificates > 0) && (
        <p className="mt-3 mb-0 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted">
          <Icon name="flag" size={14} /> {fill(t('dash.learnStats'), { done: finished, certs: learning.certificates })}
        </p>
      )}
    </Panel>
  )
}

/** Today's myth (published or built in): tap to see the truth. */
function MythToday() {
  const { t, lang } = useLanguage()
  const { myths } = useMyths(api, lang)
  const myth = localizeMyth(mythOfTheDay(undefined, myths), lang)
  const [open, setOpen] = useState(false)

  return (
    <section className="relative isolate overflow-hidden rounded-[22px] bg-brand p-6 text-on-brand" aria-labelledby="dash-myth">
      <span className="auth-blob -top-10 -right-10 size-32" aria-hidden="true" />
      <p id="dash-myth" className="relative m-0 text-[0.78rem] font-extrabold tracking-[0.08em] uppercase opacity-90">
        {t('dash.mythTitle')}
      </p>
      <p className="relative mt-2 mb-4 text-[1.15rem] leading-snug font-bold">“{myth.claim}”</p>
      {open ? (
        <div className="relative animate-[rise_400ms_ease-out]">
          <p className="m-0 mb-1 text-[0.85rem] font-extrabold uppercase opacity-90">{t('verdict.myth')}</p>
          <p className="m-0 text-[0.92rem] leading-relaxed opacity-95">{myth.truth}</p>
        </div>
      ) : (
        <button type="button" className="btn btn-sm relative bg-surface text-brand hover:bg-surface/90" onClick={() => setOpen(true)}>
          {t('dash.showTruth')}
        </button>
      )}
    </section>
  )
}

function Overview({ user, referrals, goTo }: { user: ApiUser | null; referrals: ApiReferral[] | null; goTo: (tab: Tab) => void }) {
  const { t, lang } = useLanguage()
  const { openChat } = useChatWidget()
  const threads = chatStore.loadThreads()
  const { account } = useAccount()
  const myGroups = useMyGroups(user?.id ?? (account?.mode === 'account' ? account.user.id : ''))
  // Only groups that still exist count.
  const groups = myGroups.spaces ? myGroups.spaces.filter((s) => myGroups.joined.includes(s.id)).length : myGroups.joined.length
  const waiting = referrals?.filter((r) => r.status === 'PENDING').length ?? 0
  const latest = referrals?.[0]

  const filled = user ? [user.alias, user.ageBand !== 'UNKNOWN', user.gender && user.gender !== 'PREFER_NOT_TO_SAY', user.district].filter(Boolean).length : 0
  const percent = Math.round((filled / 4) * 100)

  return (
    <div className="stagger grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon="chat" value={threads.length} label={t('dash.statChats')} onClick={openChat} />
        <Stat icon="users" value={groups} label={t('dash.statGroups')} to="/community" />
        <Stat
          icon="phone"
          value={referrals?.length ?? '–'}
          label={t('dash.statRequests')}
          note={waiting ? fill(t('dash.waiting'), { n: waiting }) : undefined}
          onClick={() => goTo('help')}
        />
      </div>

      <section aria-labelledby="dash-actions">
        <h2 id="dash-actions" className="m-0 mb-3 font-display text-[1.2rem]">
          {t('dash.quickTitle')}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACTIONS.map((a) => {
            const inner = (
              <>
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand">
                  <Icon name={a.icon} size={20} />
                </span>
                <span className="text-[0.9rem] font-semibold">{t(a.key)}</span>
              </>
            )
            const cls =
              'card group flex h-full w-full flex-col items-center gap-2.5 p-4 text-center text-fg no-underline transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand'
            return (
              <li key={a.key}>
                {a.to ? (
                  <Link to={a.to} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" className={cls} onClick={openChat}>
                    {inner}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <MyGroups spaces={myGroups.spaces} joined={myGroups.joined} />
          <ContinueLearning />
          <Panel
            id="dash-chats"
            title={t('dash.recentChats')}
            action={
              <button type="button" className={panelLink} onClick={openChat}>
                {t('dash.openChat')} <Icon name="arrowRight" size={14} />
              </button>
            }
          >
            {threads.length === 0 ? (
              <p className="m-0 text-muted">{t('dash.noChats')}</p>
            ) : (
              <ul className="grid gap-2">
                {threads.slice(0, 4).map((th) => (
                  <li key={th.id}>
                    <button
                      type="button"
                      onClick={openChat}
                      className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-left text-fg transition-colors hover:bg-brand-soft"
                    >
                      <Icon name="chat" size={16} className="shrink-0 text-brand" />
                      <span className="min-w-0 flex-1 truncate">{th.title}</span>
                      <span className="text-[0.78rem] text-muted">{relativeDay(th.updatedAt, lang)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-6">
          <MythToday />

          <Panel id="dash-help" title={t('dash.help')}>
            {latest ? (
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{latest.topic || t('pro.noTopic')}</span>
                  <span className="block text-[0.82rem] text-muted">{t('dash.latestRequest')}</span>
                </span>
                <span className={`rounded-full px-3 py-1 text-[0.8rem] font-bold ${STATUS[latest.status]?.className ?? ''}`}>
                  {t(STATUS[latest.status]?.key ?? 'pro.statusPending')}
                </span>
              </div>
            ) : (
              <p className="m-0 text-[0.92rem] text-muted">{t('pro.text')}</p>
            )}
            <button type="button" className="btn btn-sm btn-outline mt-4" onClick={() => goTo('help')}>
              <Icon name="phone" size={15} /> {latest ? t('dash.seeRequests') : t('pro.submit')}
            </button>
          </Panel>

          <Panel id="dash-complete" title={percent === 100 ? t('dash.complete') : t('dash.completeTitle')}>
            <p className="mt-0 mb-4 text-[0.92rem] text-muted">{t('dash.completeText')}</p>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-labelledby="dash-complete"
            >
              <span className="block h-full rounded-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 mb-4 text-[0.85rem] font-semibold text-brand">{percent}%</p>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => goTo('profile')}>
              <Icon name="user" size={15} /> {t('dash.completeAction')}
            </button>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/** "Today", "Yesterday" or a short date. */
function relativeDay(iso: string, lang: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  return days < 7 ? rtf.format(-days, 'day') : new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(iso))
}

/** /dashboard: the logged-in person's home: overview, profile and help from a health professional. */
export function DashboardPage() {
  const { t, lang } = useLanguage()
  const { account, user, logout } = useAccount()
  const [params, setParams] = useSearchParams()
  const tab: Tab = TABS.some((x) => x.id === params.get('tab')) ? (params.get('tab') as Tab) : 'overview'
  const [referrals, setReferralList] = useState<ApiReferral[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const loggedIn = account?.mode === 'account'

  useEffect(() => {
    if (loggedIn) api.referrals().then(setReferralList, () => setLoadFailed(true))
  }, [loggedIn])

  if (!loggedIn) return <Navigate to="/login?next=/dashboard" replace />

  const goTo = (next: Tab) => {
    setParams(next === 'overview' ? {} : { tab: next }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const name = displayName(user ?? account.user)
  const since = user ? new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(user.createdAt)) : null

  return (
    <div className="container py-8 max-sm:py-5">
      <header className="auth-panel relative isolate mb-6 overflow-hidden rounded-[32px] p-8 max-sm:p-6">
        <span className="auth-blob -top-14 -right-8 size-48" aria-hidden="true" />
        <span className="auth-blob right-40 -bottom-24 size-56" aria-hidden="true" />
        <span className="auth-blob top-6 left-1/3 size-24" aria-hidden="true" />
        <div className="stagger relative flex flex-wrap items-center gap-5">
          <span className="grid size-18 shrink-0 place-items-center rounded-3xl bg-[color-mix(in_srgb,var(--base)_20%,transparent)] font-display text-[2rem] font-bold uppercase">
            {name.charAt(0) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[0.9rem] opacity-85">{t(greetingKey())},</p>
            <h1 className="m-0 truncate font-display text-[clamp(1.5rem,4vw,2.2rem)]">{name}</h1>
            <p className="mt-1 mb-0 truncate text-[0.85rem] opacity-85">
              {user?.email ? `${user.email} · ` : ''}
              {since && `${t('account.memberSince')} ${since}`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm border-[color-mix(in_srgb,var(--base)_55%,transparent)] bg-transparent text-on-brand hover:bg-[color-mix(in_srgb,var(--base)_15%,transparent)]"
            onClick={logout}
          >
            <Icon name="arrowLeft" size={16} /> {t('account.logout')}
          </button>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t('account.myDashboard')} className="lg:sticky lg:top-24">
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
            {TABS.map((x) => (
              <li key={x.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={tab === x.id ? 'page' : undefined}
                  onClick={() => goTo(x.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold whitespace-nowrap text-muted transition-colors lg:whitespace-normal hover:bg-brand-soft hover:text-brand aria-[current=page]:bg-brand aria-[current=page]:text-on-brand"
                >
                  <Icon name={x.icon} size={18} className="shrink-0" /> {t(x.key)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div key={tab} className="page-enter min-w-0">
          {tab === 'overview' && <Overview user={user} referrals={referrals} goTo={goTo} />}
          {tab === 'profile' &&
            (user ? (
              <ProfileForm key={user.id} user={user} />
            ) : (
              <div className="card grid place-items-center p-10">
                <span className="spinner size-8" aria-label={t('community.loading')} />
              </div>
            ))}
          {tab === 'help' && (
            <Professionals referrals={referrals} loadFailed={loadFailed} setReferrals={(update) => setReferralList((r) => update(r))} />
          )}
        </div>
      </div>
    </div>
  )
}
