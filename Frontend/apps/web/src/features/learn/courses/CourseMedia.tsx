import { useState } from 'react'
import { fill } from '@intyoza/shared/i18n/translations'
import type { Lesson } from '@intyoza/shared/learn/courses/types'
import { Icon } from '../../../components/Icon'
import { RichText } from '../../../components/RichText'
import { useLanguage } from '../../../i18n/context'
import { articleBody } from '../styles'

type Props = {
  type: 'audio' | 'video'
  media: NonNullable<Lesson['media']>
  lowData: boolean
  /** When the recording plays to the end. */
  onEnded: () => void
}

/**
 * An audio or video lesson. Nothing downloads until the learner presses play, and the button shows
 * the file size first. In low-data mode a video stays hidden (the transcript is open instead) unless
 * the learner chooses to load it. Videos show subtitles when the lesson has them.
 */
export function CourseMedia({ type, media, lowData, onEnded }: Props) {
  const { t } = useLanguage()
  const [playing, setPlaying] = useState(false)
  const [allowVideo, setAllowVideo] = useState(false)
  const hasFile = Boolean(media.url)
  const [transcriptOpen, setTranscriptOpen] = useState(lowData || !hasFile)
  const videoHidden = type === 'video' && lowData && !allowVideo
  const size = media.sizeMb.toFixed(1)

  return (
    <div className="flex flex-col gap-4">
      <div className={`overflow-hidden rounded-[14px] border border-line bg-surface-2 ${type === 'video' && playing ? 'aspect-video' : ''}`}>
        {playing && media.url ? (
          type === 'video' ? (
            <video src={media.url} controls autoPlay preload="none" onEnded={onEnded} className="size-full bg-black">
              {media.subtitlesUrl && <track kind="subtitles" src={media.subtitlesUrl} default />}
            </video>
          ) : (
            <div className="p-6">
              <audio src={media.url} controls autoPlay preload="none" onEnded={onEnded} className="w-full" />
            </div>
          )
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-surface text-brand">
              <Icon name={type === 'video' ? 'play' : 'headphones'} size={26} />
            </span>
            {!hasFile ? (
              <p className="m-0 max-w-[44ch] text-[0.92rem] text-muted">{type === 'video' ? t('learn.videoSoon') : t('learn.audioSoon')}</p>
            ) : videoHidden ? (
              <>
                <p className="m-0 max-w-[44ch] text-[0.92rem] text-muted">{t('player.videoHidden')}</p>
                <button type="button" className="link-inline text-[0.92rem]" onClick={() => setAllowVideo(true)}>
                  {fill(t('player.loadAnyway'), { size })}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setPlaying(true)}>
                {fill(t('player.play'), { size })}
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={transcriptOpen} onClick={() => setTranscriptOpen((open) => !open)}>
          <Icon name="book" size={16} /> {transcriptOpen ? t('player.hideTranscript') : t('learn.readTranscript')}
        </button>
        {transcriptOpen && (
          <div className={`mt-3 rounded-[14px] border border-line bg-surface p-6 max-sm:p-5 ${articleBody}`}>
            <h2 className="mt-0 mb-3 text-[1rem]">{t('learn.transcript')}</h2>
            <RichText text={media.transcript} />
          </div>
        )}
      </div>
    </div>
  )
}
