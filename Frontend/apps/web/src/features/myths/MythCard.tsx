import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import type { Myth, Verdict } from '@intyoza/shared/myths/data'
import { localizeMyth } from '@intyoza/shared/myths/translations'
import { useLanguage } from '../../i18n/context'
import { useMythStrings } from './strings'
import { splitFact } from '@intyoza/shared/myths/game'
import { shareFactCard } from './shareCard'
import { STAMP } from './stamp'

type Props = {
  myth: Myth
  onGuess?: (correct: boolean) => void
}

// The guess buttons, in the order people expect: True, False, Partly true.
const GUESSES: { verdict: Verdict; label: 'true' | 'false' | 'partly' }[] = [
  { verdict: 'fact', label: 'true' },
  { verdict: 'myth', label: 'false' },
  { verdict: 'partly', label: 'partly' },
]

/** A myth to guess: the claim first, then a short answer, with the details one tap away. */
export function MythCard({ myth: original, onGuess }: Props) {
  const { lang } = useLanguage()
  const { s } = useMythStrings()
  const myth = localizeMyth(original, lang)
  const [guess, setGuess] = useState<Verdict | null>(null)
  const [revealed, setRevealed] = useState(false)

  const choose = (v: Verdict) => {
    setGuess(v)
    setRevealed(true)
    onGuess?.(v === myth.verdict)
  }

  return (
    <article className="card flex flex-col gap-3.5">
      <p className="m-0 text-[1.15rem] leading-[1.35] font-extrabold">“{myth.claim}”</p>

      {!revealed ? (
        <div className="mt-auto flex flex-col gap-2.5">
          <div className="grid grid-cols-3 gap-2">
            {GUESSES.map((g) => (
              <button key={g.verdict} type="button" className="btn btn-sm btn-ghost" onClick={() => choose(g.verdict)}>
                {s[g.label]}
              </button>
            ))}
          </div>
          <button type="button" className="link-inline self-start text-[0.88rem]" onClick={() => setRevealed(true)}>
            {s.showAnswer}
          </button>
        </div>
      ) : (
        <Answer myth={myth} original={original} result={guess ? (guess === myth.verdict ? s.gotIt : s.notQuite) : undefined} />
      )}
    </article>
  )
}

/** The verdict stamp, the short answer, and "Read more" for why people believe it and when to get care. */
export function Answer({ myth, original, result }: { myth: Myth; original: Myth; result?: string }) {
  const { t } = useLanguage()
  const { s } = useMythStrings()
  const [more, setMore] = useState(false)
  const [shareNote, setShareNote] = useState('')
  // Fact first: the sentence to remember, big; the myth was already shown once above.
  const { headline, rest } = splitFact(myth.truth)

  const share = async () => {
    const outcome = await shareFactCard({ stamp: t(`verdict.${myth.verdict}`).toUpperCase(), claim: myth.claim, headline, footer: 'Intyoza · Myth Buster' })
    if (outcome === 'saved') {
      setShareNote(s.imageSaved)
      setTimeout(() => setShareNote(''), 2500)
    }
  }

  return (
    <div className="message-enter flex flex-col gap-2.5">
      <p className="m-0 flex flex-wrap items-center gap-3">
        <span className={`${STAMP} ${myth.verdict === 'myth' ? 'text-brand' : 'text-fg'}`}>{t(`verdict.${myth.verdict}`)}</span>
        {result && <strong>{result}</strong>}
      </p>
      <p className="m-0 text-[1.2rem] leading-snug font-extrabold">{headline}</p>
      {rest && <p className="m-0 leading-relaxed text-muted">{rest}</p>}

      {more && (
        <div className="message-enter flex flex-col gap-2.5 [&_h4]:mb-0.5 [&_h4]:flex [&_h4]:items-center [&_h4]:gap-1.5 [&_h4]:text-[0.92rem] [&_h4]:text-muted [&_h4+p]:m-0">
          <div>
            <h4>
              <Icon name="info" size={16} /> {s.whyWrong}
            </h4>
            <p>{myth.whyBelieved}</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2.5">
            <h4>
              <Icon name="pin" size={16} /> {t('myths.whenToSee')}
            </h4>
            <p>{myth.seekCare}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.9rem] font-bold">
        <button type="button" className="link-inline" aria-expanded={more} onClick={() => setMore((m) => !m)}>
          {more ? s.readLess : s.readMore}
        </button>
        {myth.learnId && <Link to={`/learn/${myth.learnId}`}>{t('ask.learnMore')}</Link>}
        {/* The answer model understands English, so the question keeps the English wording. */}
        <Link to={`/ask?q=${encodeURIComponent(`Is it true that ${original.claim.charAt(0).toLowerCase()}${original.claim.slice(1)}`)}`}>
          {t('myths.askShort')}
        </Link>
        <Link to="/services">{s.findClinic}</Link>
        <button type="button" className="link-inline inline-flex items-center gap-1" onClick={share}>
          <Icon name="send" size={15} /> {shareNote || s.shareFact}
        </button>
      </div>
    </div>
  )
}
