import { useState, type FormEvent } from 'react'
import { useLanguage } from '../../i18n/context'
import { sendRumour } from './mythApi'
import { useMythStrings } from './strings'

/** "Heard something else?": a rumour goes to the admins to review. No name or account. */
export function RumourBox() {
  const { lang } = useLanguage()
  const { s } = useMythStrings()
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setState('sending')
    const ok = await sendRumour(text, lang)
    setState(ok ? 'sent' : 'failed')
    if (ok) setText('')
  }

  return (
    <section className="mt-10 flex flex-wrap items-center gap-5 rounded-[28px] bg-brand-soft p-7 max-sm:p-5" aria-labelledby="rumour-title">
      <div className="min-w-0 flex-[1_1_320px]">
        <h2 id="rumour-title" className="m-0 mb-1.5 text-[1.4rem]">
          {s.rumourTitle}
        </h2>
        <p className="m-0 leading-relaxed">{s.rumourText}</p>
      </div>
      <form onSubmit={submit} className="flex min-w-0 flex-[1_1_380px] flex-col gap-2">
        <div className="flex gap-2 max-sm:flex-col">
          <label htmlFor="rumour" className="sr-only">
            {s.rumourTitle}
          </label>
          <input
            id="rumour"
            className="input min-w-0 flex-1 bg-surface"
            placeholder={s.rumourPlaceholder}
            value={text}
            maxLength={300}
            onChange={(e) => {
              setText(e.target.value)
              if (state !== 'sending') setState('idle')
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={!text.trim() || state === 'sending'}>
            {s.send}
          </button>
        </div>
        <p className="m-0 text-[0.85rem]" aria-live="polite">
          {state === 'sent' ? s.rumourThanks : state === 'failed' ? s.rumourFailed : s.rumourPrivate}
        </p>
      </form>
    </section>
  )
}
