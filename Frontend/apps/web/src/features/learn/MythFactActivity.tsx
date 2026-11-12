import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { fill } from '@intyoza/shared/i18n/translations'
import type { MythFactCard } from '@intyoza/shared/learn/types'
import { activity, activityResult, feedback, scoreText } from './styles'

type Props = { cards: MythFactCard[]; onFinish: (score: number, total: number) => void }

export function MythFactActivity({ cards, onFinish }: Props) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const [guess, setGuess] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const card = cards[index]
  const correct = guess !== null && guess === card.isMyth

  const answer = (saysMyth: boolean) => {
    setGuess(saysMyth)
    if (saysMyth === card.isMyth) setScore((s) => s + 1)
  }

  const next = () => {
    if (index + 1 < cards.length) {
      setIndex(index + 1)
      setGuess(null)
    } else {
      setFinished(true)
      onFinish(score, cards.length)
    }
  }

  if (finished) {
    return (
      <div className={activityResult} role="status">
        <p className={scoreText}>
          {score} / {cards.length}
        </p>
        <h3>{t('learn.mythBuster')}</h3>
        <p className="text-muted">{t('learn.shareLearned')}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setIndex(0)
            setGuess(null)
            setScore(0)
            setFinished(false)
          }}
        >
          <Icon name="refresh" size={18} /> {t('learn.playAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className={activity}>
      <p className="text-[0.85rem] text-muted">
        {fill(t('learn.cardOf'), { n: index + 1, total: cards.length })}
      </p>
      <p className="!my-2 text-2xl leading-[1.3] font-extrabold">“{card.statement}”</p>

      {guess === null ? (
        <div className="grid w-full grid-cols-2 gap-3 [&_.btn]:min-h-14 [&_.btn]:text-[1.1rem]">
          <button type="button" className="btn btn-accent" onClick={() => answer(true)}>
            {t('verdict.myth')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => answer(false)}>
            {t('verdict.fact')}
          </button>
        </div>
      ) : (
        <>
          <div className={feedback(correct)} role="status">
            <strong>
              {correct ? t('learn.correctDash') : t('learn.notQuiteDash')}
              {card.isMyth ? t('learn.isMyth') : t('learn.isFact')}
            </strong>{' '}
            {card.explanation}
          </div>
          <button type="button" className="btn btn-primary" onClick={next}>
            {index + 1 < cards.length ? t('learn.nextCard') : t('learn.seeScore')} <Icon name="arrowRight" size={18} />
          </button>
        </>
      )}
    </div>
  )
}
