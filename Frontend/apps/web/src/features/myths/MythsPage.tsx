import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import type { TopicId } from '@intyoza/shared/chat/types'
import { MYTHS, type Myth } from '@intyoza/shared/myths/data'
import { useMyths } from '@intyoza/shared/myths/useMyths'
import { api } from '../../lib/api'
import { dayStreak, levelOf, topicProgress } from '@intyoza/shared/myths/game'
import { findMyths, mythOfTheDay } from '@intyoza/shared/myths/match'
import { localizeMyth } from '@intyoza/shared/myths/translations'
import { Answer, MythCard } from './MythCard'
import { MythGame } from './MythGame'
import { RumourBox } from './RumourBox'
import { useMythStrings } from './strings'
import { useGameStats } from './useGameStats'

const TOPICS = [...new Set(MYTHS.map((m) => m.topic))].filter(Boolean) as TopicId[]
const PAGE = 6

export function MythsPage() {
  const [params, setParams] = useSearchParams()
  const { lang } = useLanguage()
  // The myths admins publish (GET /myths) together with those built into the app.
  const { myths } = useMyths(api, lang)

  // The game opens with ?play=1, so "Challenge a friend" links straight to it.
  if (params.get('play') === '1') {
    return (
      <div className="container">
        <MythGame
          myths={myths}
          onExit={() => {
            setParams({}, { replace: true })
            window.scrollTo(0, 0)
          }}
        />
      </div>
    )
  }
  const play = () => {
    setParams({ play: '1' })
    window.scrollTo(0, 0)
  }
  return <MythsHome myths={myths} onPlay={play} initialQuery={params.get('q')?.trim() ?? ''} />
}

function MythsHome({ myths, onPlay, initialQuery }: { myths: Myth[]; onPlay: () => void; initialQuery: string }) {
  const { t } = useLanguage()
  const { s } = useMythStrings()
  const [draft, setDraft] = useState(initialQuery)
  // Arriving from the home page's "Type something you heard" box: check it straight away.
  const [checked, setChecked] = useState<{ text: string; results: Myth[] } | null>(() =>
    initialQuery ? { text: initialQuery, results: findMyths(initialQuery, 3, myths).map((r) => r.myth) } : null,
  )
  const [topic, setTopic] = useState<TopicId | null>(null)
  const [shown, setShown] = useState(PAGE)

  const list = useMemo(() => myths.filter((m) => !topic || m.topic === topic), [myths, topic])

  const check = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setChecked({ text, results: findMyths(text, 3, myths).map((r) => r.myth) })
  }

  const pickTopic = (tp: TopicId | null) => {
    setTopic(tp)
    setShown(PAGE)
  }

  return (
    <div className="container">
      <header className="page-head flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0">{t('feature.myths.title')}</h1>
          <p className="mt-1.5 mb-0 text-[1.05rem] text-muted">{s.subtitle}</p>
        </div>
        <form onSubmit={check} className="flex min-w-[280px] flex-[0_1_480px] gap-2">
          <label className="sr-only" htmlFor="myth-check">
            {t('myths.checkLabel')}
          </label>
          <input
            id="myth-check"
            className="input min-w-0 flex-1"
            placeholder={t('myths.checkPlaceholder')}
            value={draft}
            maxLength={300}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
            <Icon name="search" size={18} /> {t('myths.check')}
          </button>
        </form>
      </header>

      {checked && (
        <section className="mb-8 flex flex-col gap-3" aria-live="polite">
          {checked.results.length > 0 ? (
            <>
              <p className="m-0 text-[0.9rem] text-muted">{t('myths.matches')}</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] items-start gap-4">
                {checked.results.map((m) => (
                  <MythCard key={`check-${m.id}`} myth={m} />
                ))}
              </div>
            </>
          ) : (
            <div className="notice">
              <Icon name="chat" size={18} />
              <div>
                <p className="mt-0 mb-2.5">{t('myths.noMatch')}</p>
                <Link to={`/ask?q=${encodeURIComponent(`Is it true that ${checked.text}`)}`} className="btn btn-sm btn-primary">
                  {t('myths.askIntyoza')}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mb-10 flex flex-wrap gap-5">
        <MythOfTheDay myths={myths} />
        <GameCard onPlay={onPlay} />
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[1.5rem]">{s.common}</h2>
          <div className="chip-row">
            <button type="button" className="chip" aria-pressed={topic === null} onClick={() => pickTopic(null)}>
              {t('common.all')}
            </button>
            {TOPICS.map((tp) => (
              <button key={tp} type="button" className="chip" aria-pressed={topic === tp} onClick={() => pickTopic(tp)}>
                {t(`topic.${tp}` as TKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] items-start gap-4">
          {list.slice(0, shown).map((m) => (
            <MythCard key={m.id} myth={m} />
          ))}
        </div>

        {shown < list.length && (
          <button type="button" className="btn btn-ghost self-center" onClick={() => setShown((n) => n + PAGE)}>
            {s.showMore}
          </button>
        )}
      </section>

      <RumourBox />

      <p className="mt-10 text-center text-[0.85rem] text-muted">{t('myths.footer')}</p>
    </div>
  )
}

/** One clear myth a day, the same for everyone: tap to see the truth. */
function MythOfTheDay({ myths }: { myths: Myth[] }) {
  const { t, lang } = useLanguage()
  const { s } = useMythStrings()
  const original = mythOfTheDay(undefined, myths)
  const myth = localizeMyth(original, lang)
  const [open, setOpen] = useState(false)

  return (
    <section className="card flex min-h-[300px] min-w-0 flex-[3_1_480px] flex-col gap-4 p-8 max-sm:p-5" aria-label={s.ofTheDay}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.8rem] font-extrabold tracking-[0.08em] text-brand uppercase">{s.ofTheDay}</span>
        <span className="text-[0.85rem] text-muted">
          {original.topic ? `${t(`topic.${original.topic}` as TKey)} · ` : ''}
          {s.newTomorrow}
        </span>
      </div>
      <p className="m-0 text-[2.1rem] leading-[1.2] font-extrabold max-sm:text-[1.5rem]">“{myth.claim}”</p>
      {open ? (
        <Answer myth={myth} original={original} />
      ) : (
        <button type="button" className="btn btn-primary mt-auto self-start" onClick={() => setOpen(true)}>
          {s.showTruth}
        </button>
      )}
    </section>
  )
}

/** The way into True or False, with the person's level and streak (kept on this device). */
function GameCard({ onPlay }: { onPlay: () => void }) {
  const { s, f, levelName } = useMythStrings()
  const { stats } = useGameStats()
  const level = levelOf(stats.busted)
  const days = dayStreak(stats.days)
  const badges = topicProgress(stats).filter((tp) => tp.badge).length

  return (
    <section className="flex min-w-0 flex-[2_1_320px] flex-col gap-4 rounded-[28px] bg-brand p-8 text-on-brand max-sm:p-5" aria-label={s.gameTitle}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[1.6rem] text-inherit">{s.gameTitle}</h2>
        {days > 0 && (
          <span className="rounded-full bg-[color-mix(in_srgb,currentColor_18%,transparent)] px-3 py-1 text-[0.85rem] font-bold">
            {f(s.streakDays, { n: days })}
          </span>
        )}
      </div>
      <p className="m-0 leading-relaxed opacity-90">{s.gameText}</p>
      <div className="flex flex-col gap-2">
        <div className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,currentColor_25%,transparent)]">
          <div className="h-full rounded-full bg-current" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <span className="text-[0.85rem] opacity-90">
          {f(s.level, { n: level.index + 1, name: levelName(level.index) })}
          {level.toNext !== undefined && ` · ${f(s.toNext, { n: level.toNext, name: levelName(level.index + 1) })}`}
          {badges > 0 && ` · ${f(s.badges, { n: badges })}`}
        </span>
      </div>
      <button type="button" className="btn mt-auto bg-surface text-fg hover:bg-surface-2" onClick={onPlay}>
        {s.start} <Icon name="arrowRight" size={18} />
      </button>
    </section>
  )
}
