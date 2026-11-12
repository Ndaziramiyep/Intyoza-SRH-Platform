import type { Lang } from '@intyoza/shared/i18n/translations'
import type { StaffLesson } from '@intyoza/shared/learn/courses/staffTypes'
import { Icon } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { ArticleScreens } from '../learn/courses/ArticleScreens'
import { CourseMedia } from '../learn/courses/CourseMedia'
import { CheckedBadge, LessonTypeLabel } from '../learn/courses/ui'
import { MythFactActivity } from '../learn/MythFactActivity'

// "See as a learner": the lesson as it shows in the player, on a phone-sized screen, in one
// language. It uses the learner's own components, so what staff see is what learners get.
// Text missing in this language falls back to English, as it does for learners.

export function PhonePreview({ lesson, lang }: { lesson: StaffLesson; lang: Lang }) {
  const { t } = useLanguage()
  const text = lesson.text[lang]?.title ? lesson.text[lang]! : (lesson.text.en ?? { title: '', screens: [], transcript: '' })
  const screens = (lesson.text[lang]?.screens?.some((s) => s.trim()) ? lesson.text[lang]!.screens : (lesson.text.en?.screens ?? [])).filter((s) => s.trim())
  const pickText = <T,>(byLang: Partial<Record<Lang, T>>) => byLang[lang] ?? byLang.en
  // A fresh preview whenever the content changes, so article screens restart at the first one.
  const version = JSON.stringify([lang, lesson.text, lesson.questions, lesson.cards, lesson.media])

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div className="h-[600px] w-[340px] max-w-full overflow-y-auto rounded-[34px] border-[10px] border-fg/85 bg-bg shadow-lg" aria-label={t('staff.preview')} role="region" tabIndex={0}>
        <div className="flex flex-col gap-3 p-4">
          <p className="m-0 flex items-center gap-2 text-[0.75rem] font-semibold text-muted">
            <LessonTypeLabel type={lesson.type} /> · {lesson.minutes} min
          </p>
          <h3 className="m-0 font-display text-[1.25rem] leading-tight">{text.title || t('staff.untitled')}</h3>
          <CheckedBadge className="text-[0.78rem]" />

          {lesson.type === 'article' && (screens.length > 0 ? <ArticleScreens key={version} screens={screens} onReachEnd={() => undefined} /> : <Empty />)}
          {(lesson.type === 'audio' || lesson.type === 'video') && (
            <CourseMedia
              key={version}
              type={lesson.type}
              media={{ url: lesson.media?.url || undefined, sizeMb: lesson.media?.sizeMb ?? 0, subtitlesUrl: lesson.media?.subtitlesUrl, transcript: text.transcript }}
              lowData={false}
              onEnded={() => undefined}
            />
          )}
          {lesson.type === 'myth_fact' &&
            (lesson.cards.length > 0 ? (
              <MythFactActivity
                key={version}
                cards={lesson.cards.map((c) => ({ isMyth: c.isMyth, statement: pickText(c.text)?.statement ?? '', explanation: pickText(c.text)?.explanation ?? '' }))}
                onFinish={() => undefined}
              />
            ) : (
              <Empty />
            ))}
          {lesson.type === 'quiz' &&
            (lesson.questions.length > 0 ? (
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {lesson.questions.map((q, i) => {
                  const qt = pickText(q.text)
                  return (
                    <li key={q.id} className="card flex flex-col gap-2 p-3.5 text-[0.88rem]">
                      <p className="m-0 font-semibold">
                        {i + 1}. {qt?.question}
                      </p>
                      <ul className="m-0 flex list-none flex-col gap-1 p-0">
                        {qt?.options.map((o, k) => (
                          <li key={k} className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${k === q.correctIndex ? 'bg-success-soft font-semibold text-success' : 'bg-surface-2'}`}>
                            {k === q.correctIndex && <Icon name="check" size={12} />} {o}
                          </li>
                        ))}
                      </ul>
                      <p className="m-0 text-muted">{qt?.explanation}</p>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <Empty />
            ))}
        </div>
      </div>
      <figcaption className="text-[0.8rem] text-muted">
        {t('staff.previewCaption')} · {lang.toUpperCase()}
      </figcaption>
    </figure>
  )
}

function Empty() {
  const { t } = useLanguage()
  return <p className="m-0 rounded-lg bg-surface-2 p-4 text-[0.88rem] text-muted">{t('staff.previewEmpty')}</p>
}
