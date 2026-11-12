import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { activity, activityResult, feedback, scoreText } from './styles'
import { useLanguage } from '../../i18n/context'
import { fill } from '@intyoza/shared/i18n/translations'
import type { QuizQuestion } from '@intyoza/shared/learn/types'

type Props = { questions: QuizQuestion[]; onFinish: (score: number, total: number) => void }

const OPTION_STATE = {
  idle: 'border-line',
  correct: 'border-fg bg-surface-2',
  wrong: 'border-brand bg-brand-soft',
  dim: 'border-line opacity-55',
}

export function Quiz({ questions, onFinish }: Props) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const q = questions[index]
  const answered = chosen !== null

  const choose = (i: number) => {
    if (answered) return
    setChosen(i)
    if (i === q.answer) setScore((s) => s + 1)
  }

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setChosen(null)
    } else {
      setFinished(true)
      onFinish(score, questions.length)
    }
  }

  const restart = () => {
    setIndex(0)
    setChosen(null)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    const great = score >= questions.length - 1
    return (
      <div className={activityResult} role="status">
        <p className={scoreText}>
          {score} / {questions.length}
        </p>
        <h3>{great ? t('learn.greatJob') : t('learn.niceTry')}</h3>
        <p className="text-muted">{t('learn.retakeNote')}</p>
        <button type="button" className="btn btn-primary" onClick={restart}>
          <Icon name="refresh" size={18} /> {t('learn.tryAgain')}
        </button>
      </div>
    )
  }

  return (
    <div className={`${activity} [&_h3]:m-0 [&_h3]:text-[1.3rem]`}>
      <div className="flex w-full gap-1.5" aria-hidden="true">
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-brand' : i === index ? 'bg-[color-mix(in_srgb,var(--brand)_45%,var(--surface-2))]' : 'bg-surface-2'}`}
          />
        ))}
      </div>
      <p className="text-[0.85rem] text-muted">
        {fill(t('learn.questionOf'), { n: index + 1, total: questions.length })}
      </p>
      <h3>{q.question}</h3>

      <div className="flex w-full flex-col gap-2.5" role="group" aria-label="Answers">
        {q.options.map((opt, i) => {
          const state = !answered ? 'idle' : i === q.answer ? 'correct' : i === chosen ? 'wrong' : 'dim'
          return (
            <button key={opt} type="button" className={`flex min-h-[52px] w-full items-center justify-between gap-2.5 rounded-lg border-2 bg-surface px-4 py-3 text-left font-semibold text-fg enabled:hover:border-brand disabled:cursor-default ${OPTION_STATE[state]}`} onClick={() => choose(i)} disabled={answered}>
              {opt}
              {state === 'correct' && <Icon name="check" size={18} />}
              {state === 'wrong' && <Icon name="close" size={18} />}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={feedback(chosen === q.answer)} role="status">
          <strong>{chosen === q.answer ? t('learn.correct') : t('learn.notQuite')}</strong> {q.explanation}
        </div>
      )}

      {answered && (
        <button type="button" className="btn btn-primary" onClick={next}>
          {index + 1 < questions.length ? t('learn.nextQuestion') : t('learn.seeScore')} <Icon name="arrowRight" size={18} />
        </button>
      )}
    </div>
  )
}
