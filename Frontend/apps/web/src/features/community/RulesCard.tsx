import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { COMMUNITY_RULES } from '@intyoza/shared/community/data'

/** The community rules, folded away until someone wants to read them. */
export function RulesList() {
  const { t } = useLanguage()
  return (
    <details>
      <summary className="inline-flex cursor-pointer items-center gap-2 font-semibold text-brand">
        <Icon name="shield" size={18} /> {t('community.rulesTitle')}
      </summary>
      <ol className="mt-2 mb-0 list-decimal pl-[1.3em] text-[0.92rem] [&_li]:mb-2">
        {COMMUNITY_RULES.map((r) => (
          <li key={r.title}>
            <strong>{r.title}.</strong> {r.text}
          </li>
        ))}
      </ol>
    </details>
  )
}
