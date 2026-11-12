import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { articleBody } from './styles'
import { RichText } from '../../components/RichText'
import { useLanguage } from '../../i18n/context'
import type { LearnItem } from '@intyoza/shared/learn/types'

type Props = {
  kind: 'video' | 'audio'
  media: NonNullable<LearnItem['media']>
  transcript: string
  lowData: boolean
  onFinished: () => void
}

// Media is never downloaded until the user asks for it, and the transcript is
// always available, so the lesson works on slow or expensive connections.
export function MediaPlayer({ kind, media, transcript, lowData, onFinished }: Props) {
  const { t } = useLanguage()
  const [load, setLoad] = useState(false)
  const [showTranscript, setShowTranscript] = useState(lowData)

  return (
    <div className="flex flex-col items-start gap-3">
      <div className={`w-full overflow-hidden rounded-[14px] bg-surface-2 ${kind === 'video' ? 'aspect-video' : ''}`}>
        {load && media.src ? (
          kind === 'video' ? (
            <video src={media.src} controls autoPlay preload="none" onEnded={onFinished} className="size-full" />
          ) : (
            <audio src={media.src} controls autoPlay preload="none" onEnded={onFinished} className="my-6 w-full" />
          )
        ) : (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 p-6 text-center text-muted [&_p]:m-0 [&_p]:max-w-[40ch]">
            <Icon name={kind === 'video' ? 'play' : 'headphones'} size={36} />
            {media.src ? (
              <>
                <button type="button" className="btn btn-primary" onClick={() => setLoad(true)}>
                  {kind === 'video' ? t('learn.playVideo') : t('learn.playAudio')} · {media.sizeMb} MB
                </button>
                {lowData && <p className="text-[0.85rem]">{t('learn.lowDataOn')}</p>}
              </>
            ) : (
              <p className="text-[0.85rem]">
                {kind === 'video' ? t('learn.videoSoon') : t('learn.audioSoon')}
              </p>
            )}
          </div>
        )}
      </div>

      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTranscript((s) => !s)} aria-expanded={showTranscript || !media.src}>
        <Icon name="book" size={16} /> {showTranscript || !media.src ? t('learn.transcript') : t('learn.readTranscript')}
      </button>

      {(showTranscript || !media.src) && (
        <div className={`w-full rounded-[14px] border border-line bg-surface p-5 ${articleBody}`}>
          <RichText text={transcript} />
          <button type="button" className="btn btn-sm btn-ghost" onClick={onFinished}>
            <Icon name="check" size={16} /> {t('learn.markDone')}
          </button>
        </div>
      )}
    </div>
  )
}
