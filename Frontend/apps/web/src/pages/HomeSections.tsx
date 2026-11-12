import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Spot, type SpotName } from '../components/Illustrations'
import { useChatWidget } from '../features/ask/chatWidgetContext'
import { FORMATS } from '../features/learn/formats'
import { pick, useLanguage } from '../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import { LEARN_ITEMS } from '@intyoza/shared/learn/content'
import { useLearnLibrary } from '@intyoza/shared/learn/library'
import type { Format } from '@intyoza/shared/learn/types'
import type { Verdict } from '@intyoza/shared/myths/data'
import { mythOfTheDay } from '@intyoza/shared/myths/match'
import { localizeMyth } from '@intyoza/shared/myths/translations'
import { useMyths } from '@intyoza/shared/myths/useMyths'
import { api } from '../lib/api'

const STRIP_QUESTIONS: TKey[] = ['home.previewQ', 'home.q5', 'home.q6', 'home.q7', 'home.q8', 'home.q9', 'home.q10']

/** Real questions drifting past: tap one to ask it. Pauses under the pointer or keyboard focus. */
export function QuestionStrip() {
  const { t } = useLanguage()
  const { askIntyoza } = useChatWidget()

  // Two copies, so the row can loop without a jump. The second is only there to be seen.
  const row = (copy: boolean) => (
    <ul className={`flex shrink-0 gap-2 pr-2 ${copy ? 'marquee-copy' : ''}`} aria-hidden={copy || undefined}>
      {STRIP_QUESTIONS.map((key) => (
        <li key={key}>
          <button type="button" className="chip whitespace-nowrap" tabIndex={copy ? -1 : undefined} onClick={() => askIntyoza(t(key))}>
            {t(key)}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="marquee mb-12 py-1" aria-label={t('home.stripLabel')}>
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  )
}

const HELP_LINES: { number: string; key: TKey }[] = [
  { number: '912', key: 'hotline.ambulance' },
  { number: '114', key: 'hotline.health' },
  { number: '116', key: 'hotline.child' },
]

/** The free lines, one tap away, without scrolling to the footer. */
export function HelpBanner() {
  const { t } = useLanguage()
  return (
    <section className="reveal container mb-14" aria-labelledby="help-title">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[22px] bg-brand px-6 py-4 text-on-brand">
        <h2 id="help-title" className="m-0 flex items-center gap-2 text-[1.15rem] text-inherit">
          <Icon name="phone" size={20} className="shrink-0" />
          {t('home.careTitle')}
        </h2>
        <ul className="flex flex-1 flex-wrap justify-end gap-2 max-[900px]:justify-start">
          {HELP_LINES.map((line) => (
            <li key={line.number}>
              <a href={`tel:${line.number}`} className="btn btn-sm h-auto bg-on-brand whitespace-normal text-brand">
                <strong>{line.number}</strong> {t(line.key)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** A soft edge for a tinted section, in place of a straight line. */
function Wave({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true" className={`-mb-px block h-8 w-full fill-brand-soft sm:h-14 ${flip ? 'mt-[-1px] mb-0 rotate-180' : ''}`}>
      <path d="M0 60V32C240-4 480-4 720 30s480 34 720 2v28z" />
    </svg>
  )
}

const HOW_STEPS: { spot: SpotName; title: TKey; text: TKey }[] = [
  { spot: 'ask', title: 'home.howAsk', text: 'home.howAskText' },
  { spot: 'learn', title: 'home.howLearn', text: 'home.howLearnText' },
  { spot: 'services', title: 'home.howCare', text: 'home.howCareText' },
]

/** Three steps joined by a line that draws itself when the section scrolls into view. */
export function HowItWorks() {
  const { t } = useLanguage()
  return (
    <section className="mt-14" aria-labelledby="how-title">
      <Wave />
      <div className="reveal bg-brand-soft py-10">
        <div className="container">
          <h2 id="how-title" className="mb-8 text-center font-display text-[clamp(1.6rem,3vw,2.1rem)]">
            {t('home.howTitle')}
          </h2>
          <ol className="relative grid grid-cols-3 gap-6 max-[700px]:grid-cols-1">
            <span className="how-line absolute bg-brand" aria-hidden="true" />
            {HOW_STEPS.map((step) => (
              <li key={step.title} className="relative flex flex-col items-center text-center max-[700px]:flex-row max-[700px]:items-start max-[700px]:gap-4 max-[700px]:text-left">
                <span className="grid size-20 shrink-0 place-items-center rounded-full bg-surface max-[700px]:size-16">
                  <Spot name={step.spot} className="size-11 max-[700px]:size-9" />
                </span>
                <span className="block">
                  <h3 className="mt-3 mb-1 text-[1.05rem] max-[700px]:mt-1">{t(step.title)}</h3>
                  <p className="m-0 max-w-[32ch] text-[0.92rem] text-muted">{t(step.text)}</p>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Wave flip />
    </section>
  )
}

const PREVIEW_FORMATS: Format[] = ['video', 'audio', 'article']

/**
 * A taste of the Learning Hub: the latest articles admins published (GET /learning/articles), or,
 * until there are any, one built-in lesson of each kind.
 */
export function LessonPreview() {
  const { t, lang } = useLanguage()
  const library = useLearnLibrary(api, lang)
  const lessons = library.isLive
    ? library.items.slice(0, 3)
    : PREVIEW_FORMATS.map((format) => LEARN_ITEMS.find((item) => item.format === format)).filter((item) => item !== undefined)

  return (
    <section className="reveal container pt-10" aria-labelledby="lessons-title">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="lessons-title" className="m-0 font-display text-[clamp(1.6rem,3vw,2.1rem)]">
          {t('feature.learn.title')}
        </h2>
        <Link to="/learn" className="text-[0.92rem] font-semibold">
          {t('home.ctaLearn')} →
        </Link>
      </div>
      <ul className="stagger grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        {lessons.map((item) => (
          <li key={item.id}>
            <Link to={`/learn/${item.id}`} className="lesson-card lift flex h-full flex-col overflow-hidden rounded-[20px] border border-line bg-surface text-fg no-underline">
              <span className="grid h-28 place-items-center bg-brand-soft text-brand">
                <span className="grid size-14 place-items-center rounded-full bg-brand text-on-brand">
                  <Icon name={FORMATS[item.format].icon} size={24} />
                </span>
              </span>
              <span className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-[0.78rem] font-semibold tracking-[0.04em] text-muted uppercase">
                  {t(`format.${item.format}`)}
                  {/* Published articles only know their length once opened. */}
                  {item.minutes > 0 && ` · ${item.minutes} min`}
                </span>
                <strong className="font-display text-[1.05rem] leading-snug font-semibold">{pick(item.title, lang)}</strong>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

const GUESSES: { verdict: Verdict; label: TKey }[] = [
  { verdict: 'myth', label: 'verdict.myth' },
  { verdict: 'fact', label: 'guess.fact' },
  { verdict: 'partly', label: 'verdict.partly' },
]

/** Today's myth as a quick game: guess first, then the card turns over to show the answer. */
export function MythGame() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { myths } = useMyths(api, lang)
  const myth = localizeMyth(mythOfTheDay(undefined, myths), lang)
  const [guess, setGuess] = useState<Verdict | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [heard, setHeard] = useState('')

  const onCheck = (e: FormEvent) => {
    e.preventDefault()
    if (heard.trim()) navigate(`/myths?q=${encodeURIComponent(heard.trim())}`)
  }

  return (
    <div className="flex flex-col rounded-3xl bg-fg px-[22px] pt-[26px] pb-[22px] text-bg [&_p]:m-0">
      <p className="text-[0.8rem] font-bold tracking-[0.08em] opacity-75 uppercase">{t('nav.myths')}</p>
      <p className="!mt-[18px] font-display text-[1.35rem] leading-[1.3] font-bold">“{myth.claim.replace(/\.$/, '')}.”</p>

      {revealed ? (
        <div className="flip-in mt-4" aria-live="polite">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-bg px-3 py-1 text-[0.8rem] font-bold text-fg uppercase">{t(`verdict.${myth.verdict}`)}</span>
            {guess && <strong className="text-[0.92rem]">{guess === myth.verdict ? t('learn.correct') : t('learn.notQuite')}</strong>}
          </p>
          <p className="!mt-3 opacity-90">{myth.truth}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {GUESSES.map((option) => (
            <button
              key={option.verdict}
              type="button"
              className="btn btn-sm border-bg/50 bg-transparent text-bg"
              onClick={() => {
                setGuess(option.verdict)
                setRevealed(true)
              }}
            >
              {t(option.label)}
            </button>
          ))}
          <button type="button" className="ml-1 cursor-pointer text-[0.85rem] underline opacity-85" onClick={() => setRevealed(true)}>
            {t('myths.justTellMe')}
          </button>
        </div>
      )}

      <form onSubmit={onCheck} className="mt-5 flex items-center gap-2 rounded-full bg-bg/10 py-[5px] pr-[5px] pl-3.5 focus-within:outline-2 focus-within:outline-bg">
        <label htmlFor="myth-heard" className="sr-only">
          {t('home.heardPlaceholder')}
        </label>
        <input
          id="myth-heard"
          value={heard}
          onChange={(e) => setHeard(e.target.value)}
          placeholder={t('home.heardPlaceholder')}
          className="h-9 min-w-0 flex-1 bg-transparent text-inherit outline-none placeholder:text-bg/70"
        />
        <button type="submit" className="btn btn-sm bg-bg text-fg">
          {t('home.checkIt')}
        </button>
      </form>
    </div>
  )
}
