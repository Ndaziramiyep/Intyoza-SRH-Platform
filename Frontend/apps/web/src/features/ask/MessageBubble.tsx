import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { RichText } from '../../components/RichText'
import { useLanguage } from '../../i18n/context'
import type { ChatMessage } from '@intyoza/shared/chat/types'
import { SoonNote, UrgentCard } from './EscalationCard'
import { NearbyPlaces } from './NearbyPlaces'
import type { Coords } from './ServicesPanel'
import { answerBubble, chipSoft, msgRow } from './styles'

// Quiet text buttons in the row under an answer (Copy, Read aloud).
const metaButton = 'rounded-md px-1 py-0.5 text-muted hover:bg-brand-soft hover:text-fg aria-pressed:text-brand'

type Props = {
  message: ChatMessage
  isLatest: boolean
  onFollowUp: (text: string) => void
  disabled: boolean
  coords: Coords | null
  locating: boolean
  onUseLocation: () => void
}

export function MessageBubble({ message, isLatest, onFollowUp, disabled, coords, locating, onUseLocation }: Props) {
  const { t } = useLanguage()
  const [simple, setSimple] = useState(false)
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  if (message.role === 'user') {
    return (
      <div className={`${isLatest ? 'message-enter' : ''} max-w-[78%] self-end rounded-[22px_22px_6px_22px] bg-brand px-[18px] py-3 leading-relaxed whitespace-pre-wrap text-on-brand`}>
        {message.text}
      </div>
    )
  }

  const urgent = message.escalation?.level === 'urgent'
  const offline = message.source === 'offline'
  const sources = message.sources ?? []
  const shown = simple && message.simple ? message.simple : message.text

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  const readAloud = () => {
    const synth = window.speechSynthesis
    synth.cancel()
    if (speaking) return setSpeaking(false)
    // Answers are in English for now.
    const utterance = new SpeechSynthesisUtterance(shown.replace(/[•*_#]/g, ''))
    utterance.lang = 'en-US'
    utterance.onend = () => setSpeaking(false)
    synth.speak(utterance)
    setSpeaking(true)
  }

  return (
    <div data-answer className={`${isLatest ? 'message-enter' : ''} flex flex-col gap-3`}>
      <div className={msgRow}>
        <span className="chat-avatar" aria-hidden="true">
          <Icon name="chat" size={16} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className={`${answerBubble} rich px-5 pt-[18px] pb-3.5 leading-relaxed`}>
            <RichText text={shown} />

            {message.personalNote && (
              <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-[0.93rem]">
                <strong>{t('ask.forYou')}:</strong> {message.personalNote}
              </p>
            )}

            {message.escalation?.level === 'soon' && <SoonNote escalation={message.escalation} />}

            <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line pt-3 text-[0.8rem] text-muted">
              {offline && <span className="tag">{t('ask.offline')}</span>}
              {sources.length > 0 && (
                <span>
                  {t('ask.source')}: {sources.join(' · ')}
                </span>
              )}
              <button type="button" className={metaButton} onClick={copy}>
                {copied ? t('ask.copied') : t('ask.copy')}
              </button>
              {'speechSynthesis' in window && (
                <button type="button" className={metaButton} aria-pressed={speaking} onClick={readAloud}>
                  {speaking ? t('ask.stopReading') : t('ask.listen')}
                </button>
              )}
              {message.simple && (
                <button
                  type="button"
                  className="ml-auto rounded-full border border-line bg-surface px-3 py-[5px] text-[0.82rem] font-semibold text-brand"
                  onClick={() => setSimple((s) => !s)}
                >
                  {simple ? t('ask.detailed') : t('ask.simpler')}
                </button>
              )}
            </div>
            {message.disclaimer && <p className="mt-2 mb-0 text-[0.78rem] text-muted">{message.disclaimer}</p>}
          </div>

          {/* Urgent help sits right under the reply so it is never missed. */}
          {urgent && message.escalation && <UrgentCard escalation={message.escalation} />}

          {/* Places only when the person asked where to get care (or a health worker should check). */}
          {!urgent && message.places && (
            <NearbyPlaces need={message.places} coords={coords} locating={locating} onUseLocation={onUseLocation} />
          )}

          {message.action && (
            <Link to={message.action.to} className="btn btn-sm btn-ghost self-start">
              {message.action.label} <Icon name="arrowRight" size={16} />
            </Link>
          )}
        </div>
      </div>

      {isLatest && message.followUps && message.followUps.length > 0 && (
        <div className="pl-11 max-[780px]:pl-0">
          {!urgent && <p className="mb-1.5 text-[0.82rem] text-muted">{t('ask.next')}</p>}
          <div className="chip-row">
            {message.followUps.map((f) => (
              <button key={f} type="button" className={chipSoft} disabled={disabled} onClick={() => onFollowUp(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
