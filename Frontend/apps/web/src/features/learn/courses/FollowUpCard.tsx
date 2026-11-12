import { useState } from 'react'
import type { FollowUp, FollowUpAnswer } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { useLanguage } from '../../../i18n/context'
import { learnClient } from '../../../lib/learn/courseClient'

/**
 * Asked once, 7 days after a course is finished: "have you visited a youth corner or health
 * centre since?" It never names the course, in case someone else sees the screen. Answering (or
 * skipping) puts it away for good.
 */
export function FollowUpCard({ followUp }: { followUp: FollowUp }) {
  const { t } = useLanguage()
  const [state, setState] = useState<'asking' | 'saving' | 'thanks' | 'gone' | 'failed'>('asking')

  if (state === 'gone') return null

  const answer = async (value: FollowUpAnswer) => {
    setState('saving')
    try {
      await learnClient.answerFollowUp(followUp.id, value)
      setState(value === 'skip' ? 'gone' : 'thanks')
    } catch {
      setState('failed')
    }
  }

  if (state === 'thanks') {
    return (
      <p className="notice m-0" role="status">
        <Icon name="heart" size={18} /> {t('follow.thanks')}
      </p>
    )
  }

  return (
    <section aria-labelledby="follow-title" className="card flex items-center gap-5 max-md:flex-col max-md:items-stretch max-md:gap-4">
      <div className="min-w-0 flex-1">
        <h2 id="follow-title" className="m-0 text-[0.8rem] font-bold tracking-[0.06em] text-brand uppercase">
          {t('follow.title')}
        </h2>
        <p className="mt-1 mb-0 font-semibold">{t('follow.text')}</p>
        {state === 'failed' && (
          <p className="mt-1.5 mb-0 text-[0.88rem] font-semibold text-coral" role="alert">
            {t('hub.ageError')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2" role="group" aria-labelledby="follow-title">
        <button type="button" className="btn btn-outline btn-sm" disabled={state === 'saving'} onClick={() => answer('yes')}>
          {t('follow.yes')}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={state === 'saving'} onClick={() => answer('no')}>
          {t('follow.no')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={state === 'saving'} onClick={() => answer('skip')}>
          {t('follow.skip')}
        </button>
      </div>
    </section>
  )
}
