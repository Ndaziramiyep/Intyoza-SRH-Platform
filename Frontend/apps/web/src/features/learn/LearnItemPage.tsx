import { Link, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { RichText } from '../../components/RichText'
import { pick, useLanguage } from '../../i18n/context'
import { LANGS } from '@intyoza/shared/i18n/translations'
import { LEARN_ITEMS } from '@intyoza/shared/learn/content'
import { useLearnItem } from '@intyoza/shared/learn/library'
import { api } from '../../lib/api'
import type { Localized } from '@intyoza/shared/learn/types'
import { CycleIllustration } from './CycleIllustration'
import { FORMATS } from './formats'
import { MediaPlayer } from './MediaPlayer'
import { MythFactActivity } from './MythFactActivity'
import { Quiz } from './Quiz'
import { useLearning } from './useLearning'
import { articleBody } from './styles'

/** Languages a piece of content has actually been written in. */
function languagesOf(text: Localized) {
  return LANGS.filter((l) => text[l.code])
}

export function LearnItemPage() {
  const { id } = useParams()
  const { t, lang } = useLanguage()
  const { progress, markDone, lowData } = useLearning()
  const { item, category, loading } = useLearnItem(api, id)

  const back = (
    <Link to="/learn" className="btn btn-ghost btn-sm back-link">
      <Icon name="arrowLeft" size={16} /> {t('learn.backToHub')}
    </Link>
  )

  if (!item) {
    return (
      <div className="container page-head">
        {back}
        {!loading && <h1>{t('learn.notFound')}</h1>}
      </div>
    )
  }

  const mainText = item.body ?? item.media?.transcript
  const available = mainText ? languagesOf(mainText) : LANGS.filter((l) => l.code === 'en')
  const shownInEnglish = mainText !== undefined && !mainText[lang as 'rw' | 'fr'] && lang !== 'en'
  const done = progress[item.id]
  const related = LEARN_ITEMS.filter((i) => i.category === item.category && i.id !== item.id).slice(0, 3)

  return (
    <div className="container">
      <header className="page-head">
        {back}
        <span className="eyebrow">
          <Icon name={FORMATS[item.format].icon} size={16} /> {t(`format.${item.format}`)}{category && ` · ${pick(category.title, lang)}`}
        </span>
        <h1>{pick(item.title, lang)}</h1>
        {pick(item.summary, lang) && <p>{pick(item.summary, lang)}</p>}
        <div className="chip-row mt-1 [&_.tag]:inline-flex [&_.tag]:items-center [&_.tag]:gap-1">
          <span className="tag">
            <Icon name="clock" size={12} /> {item.minutes} min
          </span>
          <span className="tag">{available.map((l) => l.short).join(' · ')}</span>
          {done && (
            <span className="tag tag-free">
              <Icon name="check" size={12} /> {done.score !== undefined ? `${t('learn.bestScore')} ${done.score}/${done.total}` : t('common.done')}
            </span>
          )}
        </div>
      </header>

      {shownInEnglish && (
        <div className="notice notice-warn mb-4">
          <Icon name="globe" size={18} />
          <p>{t('learn.notTranslated')}</p>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5 max-[900px]:grid-cols-1">
        <div>
          {item.format === 'article' && item.body && (
            <article className={`card ${articleBody}`}>
              {item.illustration === 'cycle' && <CycleIllustration />}
              <RichText text={pick(item.body, lang)} />
              {!done && (
                <button type="button" className="btn btn-primary" onClick={() => markDone(item.id)}>
                  <Icon name="check" size={18} /> {t('learn.markRead')}
                </button>
              )}
            </article>
          )}

          {(item.format === 'video' || item.format === 'audio') && item.media && (
            <MediaPlayer
              kind={item.format}
              media={item.media}
              transcript={pick(item.media.transcript, lang)}
              lowData={lowData}
              onFinished={() => markDone(item.id)}
            />
          )}

          {item.format === 'quiz' && item.quiz && (
            <Quiz questions={item.quiz} onFinish={(score, total) => markDone(item.id, score, total)} />
          )}

          {item.format === 'myth-fact' && item.cards && (
            <MythFactActivity cards={item.cards} onFinish={(score, total) => markDone(item.id, score, total)} />
          )}
        </div>

        <aside className="sticky top-[84px] flex flex-col gap-3.5 max-[900px]:static">
          <section className="card">
            <h3 className="flex items-center gap-2">
              <Icon name="chat" size={18} /> {t('learn.questions')}
            </h3>
            <Link
              to={item.askPrompt ? `/ask?q=${encodeURIComponent(item.askPrompt)}` : '/ask'}
              className="btn btn-primary btn-sm"
            >
              {t('home.ctaAsk')}
            </Link>
          </section>

          {related.length > 0 && (
            <section className="card">
              <h3>{t('learn.related')}</h3>
              <ul className="m-0 [&_li]:py-1.5">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/learn/${r.id}`} className="flex items-start gap-2 font-semibold no-underline [&>svg]:mt-[3px] [&>svg]:shrink-0">
                      <Icon name={FORMATS[r.format].icon} size={16} /> {pick(r.title, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
