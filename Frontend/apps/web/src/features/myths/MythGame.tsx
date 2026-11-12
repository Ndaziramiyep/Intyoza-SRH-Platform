import { useState } from 'react'
import { recordAnswer, type Answer as AnswerChoice, type AnswerCounts } from './mythApi'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'
import type { IconName } from '@intyoza/shared/icons'
import type { Myth, Verdict } from '@intyoza/shared/myths/data'
import { dayStreak, levelOf, newRound, topicProgress, type GameStats } from '@intyoza/shared/myths/game'
import { localizeMyth } from '@intyoza/shared/myths/translations'
import { Confetti } from './Confetti'
import { Answer } from './MythCard'
import { STAMP } from './stamp'
import { useMythStrings } from './strings'
import { useGameStats } from './useGameStats'

// Icons as well as words, so the three answers are easy to tell apart.
const CHOICE_ICON: Record<Verdict, IconName> = { fact: 'check', myth: 'close', partly: 'info' }

const ANSWER: Record<Verdict, AnswerChoice> = { fact: 'TRUE', myth: 'FALSE', partly: 'PARTLY' }

const CHOICES: { verdict: Verdict; label: 'true' | 'false' | 'partly' }[] = [
  { verdict: 'fact', label: 'true' },
  { verdict: 'myth', label: 'false' },
  { verdict: 'partly', label: 'partly' },
]

/** True or False: one myth at a time, a round of 10, then the score. */
/** `myths`: what a round is drawn from (published and built-in). */
export function MythGame({ myths, onExit }: { myths: Myth[]; onExit: () => void }) {
  const { t, lang } = useLanguage()
  const { s, f } = useMythStrings()
  const { stats, finishRound } = useGameStats()
  const [round, setRound] = useState<Myth[]>(() => newRound(undefined, undefined, myths))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<Verdict | null>(null)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [missed, setMissed] = useState<Myth[]>([])
  const [done, setDone] = useState(false)
  const [levelBefore, setLevelBefore] = useState(() => levelOf(stats.busted).index)
  // What other players answered (anonymous counts), once the backend has them.
  const [counts, setCounts] = useState<{ id: string; counts: AnswerCounts } | null>(null)

  const original = round[index]
  const myth = localizeMyth(original, lang)
  const correct = round.length - missed.length

  const choose = (v: Verdict) => {
    setPicked(v)
    const id = original.id
    void recordAnswer(id, ANSWER[v]).then((c) => c && setCounts({ id, counts: c }))
    if (v === original.verdict) {
      setStreak((n) => n + 1)
      setBest((b) => Math.max(b, streak + 1))
    } else {
      setStreak(0)
      setMissed((m) => [...m, original])
    }
  }

  const next = () => {
    if (index < round.length - 1) {
      setIndex((i) => i + 1)
      setPicked(null)
      return
    }
    setLevelBefore(levelOf(stats.busted).index)
    finishRound(round.filter((m) => !missed.includes(m)).map((m) => m.id), best)
    setDone(true)
    window.scrollTo(0, 0)
  }

  const playAgain = () => {
    setRound(newRound(undefined, undefined, myths))
    setIndex(0)
    setPicked(null)
    setStreak(0)
    setBest(0)
    setMissed([])
    setDone(false)
    window.scrollTo(0, 0)
  }

  if (done) {
    return (
      <Result
        correct={correct}
        total={round.length}
        best={best}
        missed={missed}
        levelBefore={levelBefore}
        stats={stats}
        onPlayAgain={playAgain}
        onExit={onExit}
      />
    )
  }

  const right = picked !== null && picked === original.verdict

  return (
    <div className="mx-auto flex max-w-[800px] flex-col gap-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onExit}>
          <Icon name="arrowLeft" size={16} /> {s.exit}
        </button>
        <div className="flex items-center gap-2">
          <span className="tag tag-brand inline-flex items-center gap-1.5 font-bold">
            <Icon name="check" size={14} /> {index + (picked ? 1 : 0) - missed.length}
          </span>
          <span
            key={streak}
            className={`tag inline-flex items-center gap-1.5 font-bold ${streak >= 3 ? 'bg-brand text-on-brand' : 'tag-brand'} ${streak > 0 ? 'animate-[pop_380ms_ease-out_backwards]' : ''}`}
          >
            <Icon name="spark" size={14} /> {f(s.streak, { n: streak })}
          </span>
        </div>
      </div>

      {/* One step per question: filled = right, dark = missed, pulsing = now. */}
      <ol className="m-0 grid list-none grid-cols-10 gap-1.5 p-0" aria-label={f(s.question, { n: index + 1, total: round.length })}>
        {round.map((m, i) => {
          const state =
            i < index || (i === index && picked)
              ? missed.includes(m)
                ? 'bg-fg/35'
                : 'bg-brand'
              : i === index
                ? 'bg-brand/45 animate-[soft-pulse_1.6s_ease-in-out_infinite]'
                : 'bg-surface-2'
          return <li key={m.id} className={`h-2.5 rounded-full transition-colors ${state}`} />
        })}
      </ol>

      <article
        key={original.id}
        className="relative overflow-hidden rounded-[28px] bg-brand p-9 text-on-brand animate-[pop_380ms_ease-out_backwards] max-sm:p-6"
        aria-live="polite"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-6 right-8 font-display text-[9rem] leading-none opacity-20 select-none">
          “
        </span>
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5 text-[0.85rem] font-bold">
            {original.topic && (
              <span className="rounded-full bg-[color-mix(in_srgb,currentColor_18%,transparent)] px-3 py-1">{t(`topic.${original.topic}` as TKey)}</span>
            )}
            <span className="opacity-85">{f(s.question, { n: index + 1, total: round.length })}</span>
          </div>
          <p className="m-0 text-[2rem] leading-[1.22] font-extrabold max-sm:text-[1.45rem]">“{myth.claim}”</p>
        </div>
      </article>

      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1" role="group" aria-label={s.gameTitle}>
        {CHOICES.map((c) => {
          const isAnswer = c.verdict === original.verdict
          const isPick = c.verdict === picked
          const look = !picked
            ? 'border-line bg-surface hover:-translate-y-0.5 hover:border-brand hover:shadow-md'
            : isAnswer
              ? 'border-brand bg-brand text-on-brand'
              : isPick
                ? 'border-fg/40 bg-surface text-muted line-through animate-[tilt_420ms_ease-in-out]'
                : 'border-line bg-surface opacity-50'
          return (
            <button
              key={c.verdict}
              type="button"
              disabled={picked !== null}
              aria-pressed={isPick}
              onClick={() => choose(c.verdict)}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 px-3 py-4 text-[1.1rem] font-extrabold transition disabled:cursor-default ${look}`}
            >
              <span
                className={`grid size-10 place-items-center rounded-full ${picked && isAnswer ? 'bg-[color-mix(in_srgb,currentColor_20%,transparent)]' : 'bg-brand-soft text-brand'}`}
              >
                <Icon name={CHOICE_ICON[c.verdict]} size={20} />
              </span>
              {s[c.label]}
            </button>
          )
        })}
      </div>

      {picked && (
        <section className="card flex flex-col gap-3 animate-[rise_300ms_ease-out_backwards]">
          <p className="m-0 flex items-center gap-3 text-[1.25rem] font-extrabold">
            <span className={`grid size-10 place-items-center rounded-full ${right ? 'bg-brand text-on-brand' : 'bg-surface-2 text-fg'}`}>
              <Icon name={right ? 'check' : 'close'} size={20} />
            </span>
            {right ? s.gotIt : s.notQuite}
          </p>
          <Answer myth={myth} original={original} />
          {counts?.id === original.id && (
            <p className="m-0 text-[0.9rem] text-muted">
              {f(s.playersSaid, { p: Math.round((counts.counts.true / counts.counts.total) * 100), answer: s.true })}
            </p>
          )}
          <button type="button" className="btn btn-primary mt-1 self-end max-sm:self-stretch" onClick={next}>
            {index < round.length - 1 ? s.next : s.seeScore} <Icon name="arrowRight" size={18} />
          </button>
        </section>
      )}
    </div>
  )
}

type ResultProps = {
  correct: number
  total: number
  best: number
  missed: Myth[]
  levelBefore: number
  stats: GameStats
  onPlayAgain: () => void
  onExit: () => void
}

function Result({ correct, total, best, missed, levelBefore, stats, onPlayAgain, onExit }: ResultProps) {
  const { t, lang } = useLanguage()
  const { s, f, levelName } = useMythStrings()
  const level = levelOf(stats.busted)
  const days = Math.max(1, dayStreak(stats.days))
  const [copied, setCopied] = useState(false)

  const challenge = async () => {
    const url = `${window.location.origin}/myths?play=1`
    try {
      if (navigator.share) {
        await navigator.share({ text: s.shareText, url })
        return
      }
      await navigator.clipboard.writeText(`${s.shareText} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* the person closed the share sheet */
    }
  }

  const leveledUp = level.index > levelBefore
  // A big moment (8 or more right, or a new level) gets confetti across the screen.
  const great = correct >= 8

  return (
    <div className="mx-auto grid max-w-[920px] grid-cols-2 items-start gap-6 py-8 max-[760px]:grid-cols-1">
      {(great || leveledUp) && <Confetti />}
      {leveledUp && (
        <section className="col-span-full flex items-center gap-5 rounded-[28px] bg-brand p-7 text-on-brand animate-[pop_500ms_ease-out_backwards] max-sm:flex-col max-sm:text-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,currentColor_18%,transparent)]">
            <Icon name="spark" size={32} />
          </span>
          <div>
            <span className="text-[0.8rem] font-extrabold tracking-[0.08em] uppercase opacity-90">{s.newLevel}</span>
            <h2 className="m-0 text-[1.8rem] text-inherit">{f(s.levelUp, { name: levelName(level.index) })}</h2>
          </div>
        </section>
      )}
      <section className="card flex flex-col items-center gap-3 p-8 text-center">
        <span className="text-[1.3rem] font-extrabold">{great ? s.greatRound : s.roundDone}</span>
        <Celebration />
        <span className="text-[0.78rem] font-extrabold tracking-[0.08em] text-brand uppercase">
          {leveledUp ? s.newLevel : s.yourLevel}
        </span>
        <h2 className="m-0 text-[2rem]">{levelName(level.index)}</h2>
        <p className="m-0 text-muted">{f(s.result, { n: correct, total })}</p>
        <div className="mt-2 grid w-full grid-cols-3 gap-2.5">
          <Stat value={`${correct}/${total}`} label={s.correct} />
          <Stat value={String(best)} label={s.bestStreak} />
          <Stat value={String(days)} label={s.daysInRow} />
        </div>
        <TopicBadges stats={stats} />
      </section>

      <div className="flex flex-col gap-4">
        <section className="card flex flex-col gap-2.5">
          <h3 className="m-0 text-[1.05rem]">{s.secondLook}</h3>
          {missed.length === 0 ? (
            <p className="m-0 text-muted">{s.allRight}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {missed.slice(0, 3).map((m) => {
                const local = localizeMyth(m, lang)
                return (
                  <li key={m.id} className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 font-bold">
                      <span className={`${STAMP} text-[0.7rem] ${m.verdict === 'myth' ? 'text-brand' : 'text-fg'}`}>{t(`verdict.${m.verdict}`)}</span>
                      “{local.claim}”
                    </span>
                    <span className="text-[0.9rem] text-muted">{local.truth}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {level.toNext !== undefined && (
          <section className="rounded-[20px] bg-brand-soft p-5">
            <p className="m-0 font-extrabold">{f(s.nextLevel, { name: levelName(level.index + 1) })}</p>
            <p className="mt-1 mb-2.5 text-[0.9rem]">{f(s.toGo, { n: level.toNext })}</p>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-brand" style={{ width: `${level.progress * 100}%` }} />
            </div>
          </section>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
            {s.playAgain}
          </button>
          <button type="button" className="btn btn-ghost" onClick={challenge}>
            {copied ? s.linkCopied : s.challenge}
          </button>
        </div>
        <p className="m-0 text-center text-[0.82rem] text-muted">{s.challengeNote}</p>
        <button type="button" className="link-inline self-center text-[0.9rem]" onClick={onExit}>
          {s.exit}
        </button>
      </div>
    </div>
  )
}

// Dots that burst out around the badge when a round ends (still under "reduce motion").
const BURST = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const r = 72 + (i % 3) * 10
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, delay: (i % 5) * 60, big: i % 2 === 0 }
})

function Celebration() {
  return (
    <span className="relative grid size-52 place-items-center">
      {BURST.map((d, i) => (
        // The outer span places the dot; the inner one animates, so the two transforms don't clash.
        <span key={i} aria-hidden="true" className="absolute" style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
          <span
            className={`block rounded-full animate-[pop_600ms_ease-out_backwards] ${d.big ? 'size-3 bg-brand' : 'size-2 bg-brand/45'}`}
            style={{ animationDelay: `${d.delay}ms` }}
          />
        </span>
      ))}
      <span className="grid size-24 place-items-center rounded-full bg-brand text-on-brand animate-[pop_500ms_ease-out_backwards]">
        <Icon name="shield" size={48} />
      </span>
    </span>
  )
}

/** One badge per topic, earned by getting every myth in it right at least once. */
function TopicBadges({ stats }: { stats: GameStats }) {
  const { t } = useLanguage()
  const { s } = useMythStrings()
  return (
    <div className="mt-3 flex w-full flex-col gap-2.5 border-t border-line pt-4 text-left">
      <span className="text-[0.95rem] font-extrabold">{s.topicsTitle}</span>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {topicProgress(stats).map((tp) => (
          <li key={tp.topic} className="flex items-center gap-2.5">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full ${tp.badge ? 'bg-brand text-on-brand' : 'bg-surface-2 text-muted'}`}
              aria-label={tp.badge ? s.badgeEarned : undefined}
            >
              <Icon name={tp.badge ? 'shield' : 'lock'} size={15} />
            </span>
            <span className="min-w-0 flex-1 text-[0.88rem] font-semibold">{t(`topic.${tp.topic}` as TKey)}</span>
            <span className="h-2 w-20 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${(tp.done / tp.total) * 100}%` }} />
            </span>
            <span className="w-9 text-right text-[0.8rem] text-muted">
              {tp.done}/{tp.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-surface-2 px-2 py-3">
      <span className="text-[1.4rem] font-extrabold">{value}</span>
      <span className="text-[0.75rem] text-muted">{label}</span>
    </div>
  )
}
