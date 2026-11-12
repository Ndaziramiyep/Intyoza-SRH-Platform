import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import { fill } from '@intyoza/shared/i18n/translations'
import { Icon } from '../../../components/Icon'
import { RichText } from '../../../components/RichText'
import { useLanguage } from '../../../i18n/context'
import { articleBody } from '../styles'

/** How far a finger must travel sideways to turn the screen. */
const SWIPE_PX = 50

/**
 * An article as short screens of a few sentences, one at a time: Back and Next buttons, the arrow
 * keys, or a swipe. `onReachEnd` runs once, when the last screen is shown.
 * Give it a `key` per lesson so it starts again on the first screen.
 */
export function ArticleScreens({ screens, onReachEnd }: { screens: string[]; onReachEnd: () => void }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const touchX = useRef<number | null>(null)
  const ended = useRef(false)
  const total = screens.length
  const last = index === total - 1

  useEffect(() => {
    if (last && !ended.current) {
      ended.current = true
      onReachEnd()
    }
  }, [last, onReachEnd])

  const go = (next: number) => setIndex(Math.max(0, Math.min(total - 1, next)))

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1)
    else if (e.key === 'ArrowLeft') go(index - 1)
    else return
    e.preventDefault()
  }
  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX)
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? index + 1 : index - 1)
  }

  return (
    <section
      className="card flex flex-col gap-5 p-7 outline-none focus-visible:outline-2 focus-visible:outline-focus max-sm:p-5"
      aria-roledescription="carousel"
      aria-label={fill(t('player.screenOf'), { n: index + 1, total })}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={`min-h-[220px] ${articleBody}`} aria-live="polite" key={index}>
        <div className="message-enter">
          <RichText text={screens[index]} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(index - 1)} disabled={index === 0}>
          <Icon name="arrowLeft" size={16} /> {t('player.back')}
        </button>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          {screens.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-brand' : i < index ? 'w-2 bg-brand/45' : 'w-2 bg-surface-2'}`} />
          ))}
        </div>
        <span className="sr-only">{fill(t('player.screenOf'), { n: index + 1, total })}</span>

        <button type="button" className="btn btn-outline btn-sm" onClick={() => go(index + 1)} disabled={last}>
          {t('player.forward')} <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </section>
  )
}
