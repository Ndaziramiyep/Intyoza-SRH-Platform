import type { Lang } from '@intyoza/shared/i18n/translations'
import type { LessonText, StaffLesson, StaffMythCard, StaffQuizQuestion } from '@intyoza/shared/learn/courses/staffTypes'
import type { QuizUse } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { hint, textIn } from './editing'
import { ConfirmButton, Field } from './ui'

// The text of one lesson in one language, by lesson type. In RW and FR every field shows the English
// text under it, for translators. `structureLocked` (translators) keeps answers, card types and the
// number of questions, cards and screens as the writer set them.

type Props = {
  lesson: StaffLesson
  lang: Lang
  onChange: (lesson: StaffLesson) => void
  structureLocked: boolean
}

const MAX_SENTENCES = 3
const sentences = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length

function Reference({ lang, text }: { lang: Lang; text?: string }) {
  if (lang === 'en' || !text?.trim()) return null
  return (
    <p className="mt-1.5 mb-0 rounded-md bg-surface-2 px-2.5 py-1.5 text-[0.82rem] text-muted">
      <span className="font-bold">EN:</span> {text}
    </p>
  )
}

export function LessonContentEditor({ lesson, lang, onChange, structureLocked }: Props) {
  const { t } = useLanguage()
  const text = textIn(lesson, lang)
  const en = lesson.text.en
  const setText = (patch: Partial<LessonText>) => onChange({ ...lesson, text: { ...lesson.text, [lang]: { ...text, ...patch } } })

  return (
    <div className="flex flex-col gap-5">
      <Field label={t('staff.lessons.title')}>
        {(id) => (
          <>
            <input id={id} className="input" value={text.title} onChange={(e) => setText({ title: e.target.value })} />
            <Reference lang={lang} text={en?.title} />
          </>
        )}
      </Field>

      {lesson.type === 'article' && <ScreensEditor screens={text.screens} enScreens={en?.screens ?? []} lang={lang} locked={structureLocked} onChange={(screens) => setText({ screens })} />}

      {(lesson.type === 'audio' || lesson.type === 'video') && (
        <Field label={t('learn.transcript')} hintText={t('staff.lessons.transcriptHint')}>
          {(id, describedBy) => (
            <>
              <textarea id={id} aria-describedby={describedBy} className="textarea min-h-56" value={text.transcript} onChange={(e) => setText({ transcript: e.target.value })} />
              <Reference lang={lang} text={en?.transcript} />
            </>
          )}
        </Field>
      )}

      {lesson.type === 'quiz' && <QuizBuilder questions={lesson.questions} lang={lang} locked={structureLocked} onChange={(questions) => onChange({ ...lesson, questions })} />}

      {lesson.type === 'myth_fact' && <CardsBuilder cards={lesson.cards} lang={lang} locked={structureLocked} onChange={(cards) => onChange({ ...lesson, cards })} />}
    </div>
  )
}

/** An article as separate short screens. */
function ScreensEditor({ screens, enScreens, lang, locked, onChange }: { screens: string[]; enScreens: string[]; lang: Lang; locked: boolean; onChange: (screens: string[]) => void }) {
  const { t } = useLanguage()
  const set = (i: number, value: string) => onChange(screens.map((s, j) => (j === i ? value : s)))
  const move = (i: number, to: number) => {
    const next = [...screens]
    const [s] = next.splice(i, 1)
    next.splice(to, 0, s)
    onChange(next)
  }

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 p-0 text-[0.85rem] font-semibold">{t('staff.lessons.screens')}</legend>
      <p className={`${hint} -mt-1`}>{t('staff.lessons.screensHint')}</p>
      {screens.map((screen, i) => {
        const long = sentences(screen) > MAX_SENTENCES
        return (
          <div key={i} className="rounded-[12px] border border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor={`screen-${lang}-${i}`} className="text-[0.82rem] font-bold text-muted">
                {t('staff.lessons.screen')} {i + 1}
              </label>
              {!locked && (
                <span className="flex gap-1">
                  <button type="button" className="icon-btn size-8" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`${t('staff.moveUp')} ${i + 1}`}>
                    <Icon name="chevronRight" size={14} className="-rotate-90" />
                  </button>
                  <button type="button" className="icon-btn size-8" disabled={i === screens.length - 1} onClick={() => move(i, i + 1)} aria-label={`${t('staff.moveDown')} ${i + 1}`}>
                    <Icon name="chevronRight" size={14} className="rotate-90" />
                  </button>
                  <button type="button" className="icon-btn size-8" disabled={screens.length === 1} onClick={() => onChange(screens.filter((_, j) => j !== i))} aria-label={`${t('staff.remove')} ${i + 1}`}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              )}
            </div>
            <textarea
              id={`screen-${lang}-${i}`}
              className="textarea min-h-24"
              value={screen}
              aria-describedby={long ? `screen-${lang}-${i}-long` : undefined}
              onChange={(e) => set(i, e.target.value)}
            />
            {long && (
              <p id={`screen-${lang}-${i}-long`} className="mt-1 mb-0 text-[0.8rem] font-semibold text-amber">
                {t('staff.lessons.screenLong')}
              </p>
            )}
            <Reference lang={lang} text={enScreens[i]} />
          </div>
        )
      })}
      {!locked && (
        <button type="button" className="btn btn-sm btn-ghost w-fit" onClick={() => onChange([...screens, ''])}>
          <Icon name="plus" size={14} /> {t('staff.lessons.addScreen')}
        </button>
      )}
    </fieldset>
  )
}

const USES: QuizUse[] = ['before', 'after', 'both']
const newQuestion = (): StaffQuizQuestion => ({ id: `q-${Date.now().toString(36)}`, use: 'both', correctIndex: 0, text: { en: { question: '', options: ['', '', ''], explanation: '' } } })

/** Questions with 2 to 4 options, the correct one, an explanation, and when they're asked. */
function QuizBuilder({ questions, lang, locked, onChange }: { questions: StaffQuizQuestion[]; lang: Lang; locked: boolean; onChange: (q: StaffQuizQuestion[]) => void }) {
  const { t } = useLanguage()
  const update = (i: number, q: StaffQuizQuestion) => onChange(questions.map((x, j) => (j === i ? q : x)))
  const textOf = (q: StaffQuizQuestion) => q.text[lang] ?? { question: '', options: (q.text.en?.options ?? ['', '']).map(() => ''), explanation: '' }
  const setText = (i: number, q: StaffQuizQuestion, patch: Partial<NonNullable<StaffQuizQuestion['text'][Lang]>>) =>
    update(i, { ...q, text: { ...q.text, [lang]: { ...textOf(q), ...patch } } })
  /** Adding or removing an option changes it in every language. */
  const setOptionCount = (i: number, q: StaffQuizQuestion, count: number) => {
    const text = Object.fromEntries(Object.entries(q.text).map(([l, v]) => [l, { ...v!, options: Array.from({ length: count }, (_, k) => v!.options[k] ?? '') }]))
    update(i, { ...q, text, correctIndex: Math.min(q.correctIndex, count - 1) })
  }

  return (
    <div className="flex flex-col gap-4">
      <p className={hint}>{t('staff.quiz.hint')}</p>
      {questions.map((q, i) => {
        const text = textOf(q)
        const en = q.text.en
        const count = Math.max(2, en?.options.length ?? text.options.length)
        return (
          <fieldset key={q.id} className="m-0 flex flex-col gap-3 rounded-[14px] border border-line p-4">
            <legend className="px-1 text-[0.82rem] font-bold text-muted">
              {t('staff.quiz.question')} {i + 1}
            </legend>
            {!locked && (
              <div className="flex flex-wrap items-end gap-3">
                <Field label={t('staff.quiz.use')}>
                  {(id) => (
                    <select id={id} className="select min-w-40" value={q.use} onChange={(e) => update(i, { ...q, use: e.target.value as QuizUse })}>
                      {USES.map((u) => (
                        <option key={u} value={u}>
                          {t(`staff.quiz.use.${u}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <span className="ml-auto">
                  <ConfirmButton label={t('staff.remove')} confirmLabel={t('staff.quiz.confirmRemove')} onConfirm={() => onChange(questions.filter((_, j) => j !== i))} />
                </span>
              </div>
            )}
            <Field label={t('staff.quiz.questionText')}>
              {(id) => (
                <>
                  <input id={id} className="input" value={text.question} onChange={(e) => setText(i, q, { question: e.target.value })} />
                  <Reference lang={lang} text={en?.question} />
                </>
              )}
            </Field>
            <div role="radiogroup" aria-label={t('staff.quiz.options')} className="flex flex-col gap-2">
              <p className="m-0 text-[0.85rem] font-semibold">
                {t('staff.quiz.options')} <span className="font-normal text-muted">· {t('staff.quiz.correctHint')}</span>
              </p>
              {Array.from({ length: count }, (_, k) => (
                <div key={k}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      className="size-4 shrink-0 accent-brand"
                      checked={q.correctIndex === k}
                      disabled={locked}
                      onChange={() => update(i, { ...q, correctIndex: k })}
                      aria-label={`${t('staff.quiz.correct')}: ${t('staff.quiz.option')} ${k + 1}`}
                    />
                    <input
                      className={`input ${q.correctIndex === k ? 'border-success' : ''}`}
                      aria-label={`${t('staff.quiz.option')} ${k + 1}`}
                      value={text.options[k] ?? ''}
                      onChange={(e) => setText(i, q, { options: Array.from({ length: count }, (_, m) => (m === k ? e.target.value : (text.options[m] ?? ''))) })}
                    />
                  </div>
                  <div className="pl-6">
                    <Reference lang={lang} text={en?.options[k]} />
                  </div>
                </div>
              ))}
              {!locked && (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm btn-ghost" disabled={count >= 4} onClick={() => setOptionCount(i, q, count + 1)}>
                    <Icon name="plus" size={14} /> {t('staff.quiz.addOption')}
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" disabled={count <= 2} onClick={() => setOptionCount(i, q, count - 1)}>
                    {t('staff.quiz.removeOption')}
                  </button>
                </div>
              )}
            </div>
            <Field label={t('staff.quiz.explanation')}>
              {(id) => (
                <>
                  <textarea id={id} className="textarea min-h-16" value={text.explanation} onChange={(e) => setText(i, q, { explanation: e.target.value })} />
                  <Reference lang={lang} text={en?.explanation} />
                </>
              )}
            </Field>
          </fieldset>
        )
      })}
      {!locked && (
        <button type="button" className="btn btn-sm btn-outline w-fit" onClick={() => onChange([...questions, newQuestion()])}>
          <Icon name="plus" size={14} /> {t('staff.quiz.add')}
        </button>
      )}
    </div>
  )
}

const newCard = (): StaffMythCard => ({ id: `c-${Date.now().toString(36)}`, isMyth: true, text: { en: { statement: '', explanation: '' } } })

/** Myth or fact statement cards. */
function CardsBuilder({ cards, lang, locked, onChange }: { cards: StaffMythCard[]; lang: Lang; locked: boolean; onChange: (c: StaffMythCard[]) => void }) {
  const { t } = useLanguage()
  const update = (i: number, c: StaffMythCard) => onChange(cards.map((x, j) => (j === i ? c : x)))
  const setText = (i: number, c: StaffMythCard, patch: Partial<{ statement: string; explanation: string }>) =>
    update(i, { ...c, text: { ...c.text, [lang]: { statement: '', explanation: '', ...c.text[lang], ...patch } } })

  return (
    <div className="flex flex-col gap-4">
      {cards.map((c, i) => (
        <fieldset key={c.id} className="m-0 flex flex-col gap-3 rounded-[14px] border border-line p-4">
          <legend className="px-1 text-[0.82rem] font-bold text-muted">
            {t('staff.cards.card')} {i + 1}
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label={t('staff.cards.answer')} className="flex gap-2">
              {[true, false].map((isMyth) => (
                <label key={String(isMyth)} className="chip has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand has-disabled:cursor-default">
                  <input type="radio" name={`myth-${c.id}`} className="accent-brand" checked={c.isMyth === isMyth} disabled={locked} onChange={() => update(i, { ...c, isMyth })} />
                  {isMyth ? t('verdict.myth') : t('verdict.fact')}
                </label>
              ))}
            </div>
            {!locked && (
              <span className="ml-auto">
                <ConfirmButton label={t('staff.remove')} confirmLabel={t('staff.cards.confirmRemove')} onConfirm={() => onChange(cards.filter((_, j) => j !== i))} />
              </span>
            )}
          </div>
          <Field label={t('staff.cards.statement')}>
            {(id) => (
              <>
                <input id={id} className="input" value={c.text[lang]?.statement ?? ''} onChange={(e) => setText(i, c, { statement: e.target.value })} />
                <Reference lang={lang} text={c.text.en?.statement} />
              </>
            )}
          </Field>
          <Field label={t('staff.quiz.explanation')}>
            {(id) => (
              <>
                <textarea id={id} className="textarea min-h-16" value={c.text[lang]?.explanation ?? ''} onChange={(e) => setText(i, c, { explanation: e.target.value })} />
                <Reference lang={lang} text={c.text.en?.explanation} />
              </>
            )}
          </Field>
        </fieldset>
      ))}
      {!locked && (
        <button type="button" className="btn btn-sm btn-outline w-fit" onClick={() => onChange([...cards, newCard()])}>
          <Icon name="plus" size={14} /> {t('staff.cards.add')}
        </button>
      )}
    </div>
  )
}
