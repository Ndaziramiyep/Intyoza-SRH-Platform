import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { TeamCard } from '../components/TeamCard'
import { Spot, type SpotName } from '../components/Illustrations'
import groupPicture from '../assets/about-friends.webp'
import { useChatWidget } from '../features/ask/chatWidgetContext'
import { useLanguage } from '../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { TEAM } from '../lib/team'
import { usePrivacy } from '../privacy/context'
import { HelpBanner, HowItWorks, LessonPreview, MythGame, QuestionStrip } from './HomeSections'

const SUGGESTIONS: TKey[] = ['home.q1', 'home.q2', 'home.q3', 'home.q4']

// Card background and accent colour per feature (full class names so Tailwind can see them).
const TONES = {
  violet: { card: 'bg-brand-soft', accent: 'text-brand' },
  teal: { card: 'bg-brand-soft', accent: 'text-brand' },
  pink: { card: 'bg-brand-soft', accent: 'text-brand' },
  lavender: { card: 'bg-brand-soft', accent: 'text-brand' },
  peach: { card: 'bg-surface-2', accent: 'text-fg' },
}

const FEATURES: { to: string; spot: SpotName; title: TKey; cta: TKey; tone: keyof typeof TONES }[] = [
  { to: '/ask', spot: 'ask', title: 'feature.ask.title', cta: 'home.ctaAsk', tone: 'violet' },
  { to: '/services', spot: 'services', title: 'feature.services.title', cta: 'home.ctaServices', tone: 'teal' },
  { to: '/community', spot: 'community', title: 'feature.community.title', cta: 'home.ctaCommunity', tone: 'pink' },
  { to: '/learn', spot: 'learn', title: 'feature.learn.title', cta: 'home.ctaLearn', tone: 'lavender' },
  { to: '/myths', spot: 'myths', title: 'feature.myths.title', cta: 'home.ctaMyths', tone: 'peach' },
]

const STEPS: { title: TKey; badge: string }[] = [
  { title: 'home.step1Title', badge: 'bg-brand-soft text-brand' },
  { title: 'home.step2Title', badge: 'bg-brand-soft text-brand' },
  { title: 'home.step3Title', badge: 'bg-brand-soft text-brand' },
]

export function HomePage() {
  const { t } = useLanguage()
  const { openSettings } = usePrivacy()
  const [question, setQuestion] = useState('')

  const { askIntyoza: ask } = useChatWidget()

  const onAsk = (e: FormEvent) => {
    e.preventDefault()
    if (question.trim()) ask(question.trim())
  }


  return (
    <div>
      <section className="container grid grid-cols-[1.05fr_0.95fr] items-center gap-12 pt-4 pb-10 max-[900px]:grid-cols-1 max-[900px]:pt-8">
        <div className="stagger">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[0.8rem] font-semibold text-brand">
            <Icon name="lock" size={14} /> {t('home.badge')}
          </span>
          <h1 className="mt-5 mb-[22px] font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.08]">
            {t('home.title1')}
            <br />
            {t('home.title2')}
            <br />
            <span className="text-brand">{t('home.title3')}</span>
          </h1>

          <form
            onSubmit={onAsk}
            className="mt-6 flex max-w-[560px] items-center rounded-full border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-surface py-1.5 pr-1.5 pl-[18px] focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus"
          >
            <label htmlFor="hero-question" className="sr-only">
              {t('home.askLabel')}
            </label>
            <input
              id="hero-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('home.askPlaceholder')}
              maxLength={1000}
              className="h-10 min-w-0 flex-1 bg-transparent text-fg outline-none"
            />
            <button type="submit" className="send-circle" aria-label={t('ask.send')} disabled={!question.trim()}>
              <Icon name="send" size={18} />
            </button>
          </form>

          <div className="chip-row mt-4 max-w-[560px]">
            {SUGGESTIONS.map((key) => (
              <button key={key} type="button" className="chip min-h-8 text-[0.85rem]" onClick={() => ask(t(key))}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative p-6">
          <span className="float-slow absolute top-0 right-0 size-[120px] rounded-full bg-brand-soft" aria-hidden="true" />
          <span className="float-up absolute bottom-9 left-0 size-[90px] rounded-full bg-brand-soft" aria-hidden="true" />
          <div className="relative rounded-[28px] bg-brand-soft p-[18px] pt-3">
            <img src={groupPicture} width={640} height={582} alt="" className="float-slow mx-auto -mb-20 block h-auto w-full max-w-[400px]" />
            <div className="relative rounded-[20px] border border-line bg-surface p-[18px]">
              <div className="flex items-center gap-2.5 border-b border-line pb-3">
                <span className="chat-avatar">
                  <Icon name="chat" size={16} />
                </span>
                <div>
                  <strong className="block font-display">Intyoza</strong>
                  <span className="text-[0.78rem] text-brand">{t('home.previewSub')}</span>
                </div>
              </div>
              <p className="talk-1 mt-3.5 mb-3 ml-auto w-fit max-w-[85%] rounded-[18px_18px_4px_18px] bg-brand px-3.5 py-[9px] text-[0.92rem] text-on-brand">
                {t('home.previewQ')}
              </p>
              <div className="relative">
                <span className="talk-typing absolute top-0 left-0 flex gap-1 rounded-[18px_18px_18px_4px] bg-surface-2 px-3.5 py-3" aria-hidden="true">
                  <span className="typing-dot size-[7px] rounded-full bg-muted" />
                  <span className="typing-dot size-[7px] rounded-full bg-muted" />
                  <span className="typing-dot size-[7px] rounded-full bg-muted" />
                </span>
                <p className="talk-2 m-0 max-w-[92%] rounded-[18px_18px_18px_4px] bg-surface-2 px-3.5 py-[11px] text-[0.9rem]">
                  {t('home.previewA')}
                </p>
              </div>
              <div className="talk-3 mt-3 flex flex-wrap gap-2">
                {(['home.previewMethods', 'home.previewCondoms'] as TKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => ask(t(key))}
                    className="rounded-full bg-brand-soft px-3 py-1 text-[0.78rem] font-medium text-brand hover:underline"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <QuestionStrip />
      <HelpBanner />

      <section className="reveal" aria-labelledby="features-title">
        <div className="container">
          <h2 id="features-title" className="mb-1 font-display text-[clamp(1.6rem,3vw,2.1rem)]">
            {t('home.featuresTitle')}
          </h2>
          <div className="mt-[26px] grid grid-cols-5 gap-4 max-[1080px]:grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))]">
            {FEATURES.map((f) => (
              <Link
                key={f.to}
                to={f.to}
                className={`lift flex min-h-[150px] flex-col rounded-[20px] border border-transparent p-[18px] text-fg no-underline ${TONES[f.tone].card}`}
              >
                <Spot name={f.spot} className="size-14" />
                <h3 className="mt-3.5 mb-1.5 text-base">{t(f.title)}</h3>
                <span className={`mt-auto text-[0.82rem] font-semibold ${TONES[f.tone].accent}`}>{t(f.cta)} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />
      <LessonPreview />

      <section className="reveal container grid grid-cols-2 gap-4 pt-12 max-[900px]:grid-cols-1">
        <MythGame />

        <div className="card rounded-3xl px-[22px] py-[26px]">
          <h2 className="font-display text-[1.45rem]">{t('home.privateTitle')}</h2>
          <ol className="my-[18px] space-y-3.5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative pl-10">
                <span
                  className={`absolute top-0 left-0 grid size-[26px] place-items-center rounded-full text-[0.85rem] font-bold ${s.badge}`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className="m-0 text-[0.95rem]">{t(s.title)}</h3>
              </li>
            ))}
          </ol>
          <button type="button" className="link-inline text-[0.9rem] font-semibold" onClick={openSettings}>
            {t('home.manageCookies')} →
          </button>
          <Spot name="privacy" className="mt-2 ml-auto block size-24" />
        </div>
      </section>

      <section className="reveal container pt-14" aria-labelledby="team-title">
        <div className="mb-8 text-center">
          <h2 id="team-title" className="m-0 font-display text-[clamp(1.6rem,3vw,2.1rem)]">
            {t('home.teamTitle')}
          </h2>
          <span className="mx-auto mt-2 block h-[3px] w-10 rounded-full bg-brand" aria-hidden="true" />
        </div>
        <ul className="stagger grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[480px]:mx-auto max-[480px]:max-w-[320px] max-[480px]:grid-cols-1">
          {TEAM.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </ul>
      </section>
    </div>
  )
}
