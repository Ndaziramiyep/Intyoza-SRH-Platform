import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/Icon'
import { pick, useLanguage } from '../../i18n/context'
import { LANGS, type Lang, type TKey } from '@intyoza/shared/i18n/translations'
import type { AboutYou, HealthContext, TopicId, UserProfile } from '@intyoza/shared/chat/types'
import { LEARN_ITEMS } from '@intyoza/shared/learn/content'
import type { CategoryId } from '@intyoza/shared/learn/types'
import { MYTHS } from '@intyoza/shared/myths/data'
import { mythOfTheDay } from '@intyoza/shared/myths/match'
import { localizeMyth } from '@intyoza/shared/myths/translations'
import { FORMATS } from '../learn/formats'
import { AboutYouForm } from './AboutYouForm'

const CONTEXTS: HealthContext[] = ['sexually-active', 'pregnant', 'young-parent', 'living-with-hiv']

const TOPIC_CATEGORY: Record<TopicId, CategoryId> = {
  menstruation: 'puberty-periods',
  puberty: 'puberty-periods',
  contraception: 'contraception',
  pregnancy: 'pregnancy',
  sti: 'sti-hiv',
  consent: 'consent-relationships',
  relationships: 'consent-relationships',
}

// Card background and icon colour (full class names so Tailwind can see them).
const TONES = {
  pink: 'bg-brand-soft [&_.learn-icon]:text-brand',
  violet: 'bg-brand-soft [&_.learn-icon]:text-brand',
  peach: 'bg-surface-2 [&_.learn-icon]:text-fg',
}

type LearnLink = { to: string; title: string; meta: string; icon: IconName; tone: keyof typeof TONES }

/** Two lessons and a myth related to what is being discussed. */
function learnLinks(topic: TopicId | undefined, lang: Lang, t: (key: TKey) => string): LearnLink[] {
  const category = topic ? TOPIC_CATEGORY[topic] : 'puberty-periods'
  const lessons = LEARN_ITEMS.filter((i) => i.category === category && (i.format === 'article' || i.format === 'audio'))
    .slice(0, 2)
    .map((i, n) => ({
      to: `/learn/${i.id}`,
      title: pick(i.title, lang),
      meta: `${t(`format.${i.format}`)} · ${i.minutes} min`,
      icon: FORMATS[i.format].icon,
      tone: n === 0 ? ('pink' as const) : ('violet' as const),
    }))
  const myth = localizeMyth(MYTHS.find((m) => m.topic === topic && m.verdict === 'myth') ?? mythOfTheDay(), lang)
  return [
    ...lessons,
    { to: `/myths?q=${encodeURIComponent(myth.claim)}`, title: `${t('ask.mythPrefix')} ${myth.claim}`, meta: t('nav.myths'), icon: 'help', tone: 'peach' },
  ]
}

const panelLabel = 'mt-4 mb-2 text-[0.9rem]'
const chipSm = 'chip min-h-8 px-3 py-1 text-[0.85rem]'

type Props = { profile: UserProfile; onChange: (p: UserProfile) => void; onSaveAbout: (about: AboutYou) => void; topic?: TopicId }

export function TailorPanel({ profile, onChange, onSaveAbout, topic }: Props) {
  const { t, lang, setLang } = useLanguage()

  const toggleContext = (c: HealthContext) =>
    onChange({
      ...profile,
      context: profile.context.includes(c) ? profile.context.filter((x) => x !== c) : [...profile.context, c],
    })

  return (
    <div>
      <section aria-labelledby="tailor-title">
        <h2 id="tailor-title">{t('ask.tailorTitle')}</h2>

        <AboutYouForm profile={profile} onSave={onSaveAbout} />

        <h3 className={panelLabel}>{t('nav.language')}</h3>
        <div className="chip-row">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              className={chipSm}
              aria-pressed={lang === l.code}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <details className="mt-3.5 text-[0.88rem]">
          <summary className="cursor-pointer font-semibold text-brand">{t('ask.context')}</summary>
          <div className="chip-row mt-2.5">
            {CONTEXTS.map((c) => (
              <button
                key={c}
                type="button"
                className={chipSm}
                aria-pressed={profile.context.includes(c)}
                onClick={() => toggleContext(c)}
              >
                {t(`context.${c}`)}
              </button>
            ))}
          </div>
        </details>
      </section>

      <section className="mt-5 border-t border-line pt-5" aria-labelledby="learn-more-title">
        <h2 id="learn-more-title" className="!mb-2.5">{t('ask.learnMore')}</h2>
        {learnLinks(topic, lang, t).map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`group mb-2 flex items-center gap-3 rounded-[14px] p-3 text-fg no-underline ${TONES[l.tone]}`}
          >
            <span className="learn-icon grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-surface">
              <Icon name={l.icon} size={16} />
            </span>
            <span>
              <strong className="block text-[0.88rem] leading-snug group-hover:underline">{l.title}</strong>
              <span className="text-[0.78rem] text-muted">{l.meta}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-5 rounded-[18px] bg-fg p-4 text-bg">
        <h2 className="!mb-3 text-inherit">{t('ask.seeSomeone')}</h2>
        <Link to="/services" className="btn btn-sm bg-bg text-fg">
          {t('ask.findServices')}
        </Link>
      </section>
    </div>
  )
}
