import { useEffect, useRef, useState } from 'react'
import { fill } from '@intyoza/shared/i18n/translations'
import type { LearnerQuizQuestion, QuizKind, QuizResult } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'

type Props = {
  lessonId: string
  /** Only the questions for this kind of quiz. */
  questions: LearnerQuizQuestion[]
  kind: QuizKind
  /** After the answers are checked. The before quiz hands over at once; the after quiz shows the review first. */
  onSubmitted: (result: QuizResult) => void
}

type Phase = 'answering' | 'checking' | 'review'

/**
 * A course quiz, one question at a time. The server checks the answers (the learner never receives
 * them in advance). Before the course: no score, it only records what the learner knew. After: the
 * score and every question with its explanation.
 */
export function CourseQuiz({ lessonId, questions, kind, onSubmitted }: Props) {
  const { t, lang } = useLanguage()
  const [index, setIndex] = useState(0)
  const [choices, setChoices] = useState<(number | null)[]>(() => questions.map(() => null))
  const [phase, setPhase] = useState<Phase>('answering')
  const [result, setResult] = useState<QuizResult | null>(null)
  const [failed, setFailed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const shown = useRef(`${index}:${phase}`)

  // Each new question (and the review) takes the focus, so screen readers read it. Not on first
  // show, which would jump the page.
  useEffect(() => {
    const now = `${index}:${phase}`
    if (now !== shown.current && phase !== 'checking') heading.current?.focus()
    shown.current = now
  }, [index, phase])

  const q = questions[index]
  const chosen = choices[index]
  const last = index === questions.length - 1

  const submit = async () => {
    setPhase('checking')
    setFailed(false)
    try {
      const answers = questions.map((question, i) => ({ questionId: question.id, choice: choices[i] ?? -1 }))
      const res = await learnClient.submitQuiz(lessonId, kind, answers, lang)
      setResult(res)
      if (kind === 'after') setPhase('review')
      onSubmitted(res)
    } catch {
      setFailed(true)
      setPhase('answering')
    }
  }

  const restart = () => {
    setChoices(questions.map(() => null))
    setIndex(0)
    setResult(null)
    setPhase('answering')
  }

  if (phase === 'review' && result) {
    const great = result.score >= result.total - 1
    return (
      <section className="flex flex-col gap-4">
        <div className="card flex flex-col items-center gap-2 py-8 text-center" role="status">
          <p className="m-0 text-5xl leading-none font-extrabold text-brand tabular-nums">
            {result.score}/{result.total}
          </p>
          <h2 ref={heading} tabIndex={-1} className="mt-2 mb-0 text-[1.3rem] outline-none">
            {great ? t('quiz.great') : t('quiz.keepGoing')}
          </h2>
          <p className="m-0 text-muted">{fill(t('quiz.score'), { score: result.score, total: result.total })}</p>
        </div>

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {questions.map((question, i) => {
            const r = result.results.find((x) => x.questionId === question.id)
            const mine = choices[i]
            return (
              <li key={question.id} className="card flex flex-col gap-2">
                <p className="m-0 flex items-start gap-2 font-semibold">
                  <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${r?.correct ? 'bg-success-soft text-success' : 'bg-coral-soft text-coral'}`}>
                    <Icon name={r?.correct ? 'check' : 'close'} size={13} />
                  </span>
                  {question.question}
                </p>
                <p className="m-0 text-[0.92rem]">
                  <span className="text-muted">{t('quiz.yourAnswer')}:</span> {mine !== null && mine >= 0 ? question.options[mine] : '—'}
                </p>
                {r && !r.correct && (
                  <p className="m-0 text-[0.92rem]">
                    <span className="text-muted">{t('quiz.correctAnswer')}:</span> <strong>{question.options[r.correctIndex]}</strong>
                  </p>
                )}
                {r?.explanation && <p className="m-0 rounded-lg bg-surface-2 px-3.5 py-2.5 text-[0.92rem]">{r.explanation}</p>}
              </li>
            )
          })}
        </ol>

        <button type="button" className="btn btn-ghost w-fit" onClick={restart}>
          <Icon name="refresh" size={16} /> {t('quiz.again')}
        </button>
      </section>
    )
  }

  return (
    <section className="card flex flex-col gap-4 p-7 max-sm:p-5">
      <div className="flex gap-1.5" aria-hidden="true">
        {questions.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? 'bg-brand' : i === index ? 'bg-brand/45' : 'bg-surface-2'}`} />
        ))}
      </div>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" disabled={phase === 'checking'}>
        <legend className="mb-3 p-0">
          <span className="mb-1 block text-[0.85rem] text-muted">{fill(t('learn.questionOf'), { n: index + 1, total: questions.length })}</span>
          <h2 ref={heading} tabIndex={-1} className="m-0 text-[1.25rem] leading-snug outline-none">
            {q.question}
          </h2>
        </legend>

        {q.options.map((option, i) => (
          <label
            key={option}
            className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-lg border-2 bg-surface px-4 py-3 font-semibold transition-colors hover:border-brand has-focus-visible:outline-2 has-focus-visible:outline-focus ${
              chosen === i ? 'border-brand bg-brand-soft' : 'border-line'
            }`}
          >
            <input
              type="radio"
              name={`quiz-${q.id}`}
              className="size-4 accent-brand"
              checked={chosen === i}
              onChange={() => setChoices((prev) => prev.map((c, j) => (j === index ? i : c)))}
            />
            {option}
          </label>
        ))}
      </fieldset>

      {failed && (
        <p className="m-0 text-[0.9rem] font-semibold text-coral" role="alert">
          {t('quiz.submitError')}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIndex(index - 1)} disabled={index === 0 || phase === 'checking'}>
          <Icon name="arrowLeft" size={16} /> {t('player.back')}
        </button>
        {last ? (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={chosen === null || phase === 'checking'} aria-busy={phase === 'checking'}>
            {phase === 'checking' && <span className="spinner size-4" aria-hidden="true" />}
            {kind === 'before' ? t('quiz.finish') : t('quiz.seeResults')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setIndex(index + 1)} disabled={chosen === null}>
            {t('quiz.next')} <Icon name="arrowRight" size={16} />
          </button>
        )}
      </div>
    </section>
  )
}
