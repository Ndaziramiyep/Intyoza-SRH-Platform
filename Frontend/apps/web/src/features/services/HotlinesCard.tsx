import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import type { TKey } from '@intyoza/shared/i18n/translations'

const HOTLINES: { label: TKey; number: string }[] = [
  { label: 'hotline.ambulance', number: '912' },
  { label: 'hotline.police', number: '112' },
  { label: 'hotline.gbv', number: '3512' },
  { label: 'hotline.child', number: '116' },
  { label: 'hotline.health', number: '114' },
]

export function HotlinesCard() {
  const { t } = useLanguage()
  return (
    <section className="card" aria-labelledby="hotlines-title">
      <h3 id="hotlines-title" className="flex items-center gap-2">
        <Icon name="phone" size={18} /> {t('hotline.title')}
      </h3>
      <ul>
        {HOTLINES.map((h) => (
          <li key={h.number} className="flex justify-between gap-3 border-b border-line py-2 last:border-b-0">
            <span>{t(h.label)}</span>
            <a href={`tel:${h.number}`} className="text-[1.05rem] font-extrabold no-underline">
              {h.number}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
