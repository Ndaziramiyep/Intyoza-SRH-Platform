import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { Community } from '@intyoza/shared/community/types'
import type { LiveCommunityApi } from '@intyoza/shared/community/useLiveCommunity'
import { RulesList } from './RulesCard'

/** The step before a group opens: see the anonymous name others will know you by and, the first time, agree to the rules. */
export function JoinCommunity({ community, api }: { community: Community; api: LiveCommunityApi }) {
  const { t } = useLanguage()
  const [agreed, setAgreed] = useState(false)

  const ready = Boolean(api.myName) && (api.rulesAccepted || agreed)

  const join = () => {
    if (!api.rulesAccepted) api.acceptRules()
    api.join(community.id)
  }

  return (
    <section className="card message-enter flex flex-col gap-4">
      <p className="m-0 flex flex-wrap items-center gap-2">
        <span className="text-[0.92rem] text-muted">{t('community.yourName')}:</span>
        <strong>{api.myName}</strong>
      </p>

      {!api.rulesAccepted && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <RulesList />
          <label className="check">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            {t('community.rulesAgree')}
          </label>
        </div>
      )}

      <button type="button" className="btn btn-primary self-end" disabled={!ready} onClick={join}>
        <Icon name="users" size={18} /> {t('community.join')}
      </button>
    </section>
  )
}
