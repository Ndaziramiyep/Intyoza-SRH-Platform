import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Spot } from '../../components/Illustrations'
import { useLanguage } from '../../i18n/context'
import { type Lang, type TKey } from '@intyoza/shared/i18n/translations'
import { currentTopicOf } from '@intyoza/shared/chat/guide'
import { TOPIC_STARTERS } from '@intyoza/shared/chat/knowledge'
import type { TopicId } from '@intyoza/shared/chat/types'
import { api } from '../../lib/api'
import { quickExit } from '../../lib/privacy/consent'
import { ChatSidebar } from './ChatSidebar'
import { useChatWidget } from './chatWidgetContext'
import { MessageBubble } from './MessageBubble'
import { ServicesPanel, type Coords } from './ServicesPanel'
import { answerBubble, chipSoft, msgRow } from './styles'
import { AboutYouForm } from './AboutYouForm'
import { TailorPanel } from './TailorPanel'
import { useChat } from './useChat'
import { useStickToBottom } from './useStickToBottom'

const TOPICS = Object.keys(TOPIC_STARTERS) as TopicId[]
const SPEECH_LANG: Record<Lang, string> = { en: 'en-US', rw: 'rw-RW', fr: 'fr-FR' }
// Five lines of text; after that the box scrolls.
const MAX_INPUT_HEIGHT = 120
// At this width and below, the chatbot fills the screen (and the bottom tabs replace the navbar).
const PHONE = '(max-width: 700px)'

type Recognition = {
  lang: string
  interimResults: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onend: () => void
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

const SpeechRecognition = ((window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition) as
  | RecognitionCtor
  | undefined

// Voice questions are recorded here and turned into text by Intyoza's own speech model (backend /ai/transcribe),
// so the voice is not sent to an outside company. The browser's SpeechRecognition is only used when recording
// is not possible in this browser.
const CAN_RECORD =
  typeof window !== 'undefined' && 'MediaRecorder' in window && Boolean(navigator.mediaDevices?.getUserMedia)
const MAX_RECORDING_MS = 30_000

function formatStarted(iso: string, lang: Lang, todayLabel: string) {
  const date = new Date(iso)
  const time = date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const today = new Date().toDateString() === date.toDateString()
  return today ? `${todayLabel}, ${time}` : `${date.toLocaleDateString(lang, { day: 'numeric', month: 'short' })}, ${time}`
}

/** Ask Intyoza: a chatbot that opens over any page from the button in the corner. */
export function ChatWidget() {
  const { t, lang } = useLanguage()
  const { open, openChat, closeChat, request, clearRequest } = useChatWidget()
  const chat = useChat()
  const { messages, pending, send } = chat
  const { pathname } = useLocation()
  const [view, setView] = useState<'chat' | 'history' | 'panel'>('chat')
  const [draft, setDraft] = useState('')
  const [topicsOpen, setTopicsOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [locating, setLocating] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceNeedsLogin, setVoiceNeedsLogin] = useState(false)
  const recognitionRef = useRef<Recognition | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const latest = messages[messages.length - 1]
  const { ref: scrollRef, onScroll, stick } = useStickToBottom<HTMLDivElement>(
    `${messages.length}-${pending}-${open}-${view}`,
    chat.active?.id,
    // The about-you form opens at its title; a new answer at its first line; urgent help at the card with the numbers to call.
    messages.length === 0 && !chat.profile.aboutAnswered
      ? '[aria-labelledby="about-title"]'
      : pending || latest?.role !== 'assistant'
        ? null
        : latest.escalation?.level === 'urgent'
          ? '[role=alert]'
          : '[data-answer]',
  )

  const urgent = [...messages].reverse().find((m) => m.escalation?.level === 'urgent')?.escalation
  const topic = currentTopicOf(messages)

  const ask = (text: string, options?: { suggestion?: boolean }) => {
    stick()
    setView('chat')
    void send(text, options)
  }

  // A question from elsewhere in the app (a suggestion, a lesson, a myth) starts its own chat.
  if (request && view !== 'chat') setView('chat')
  useEffect(() => {
    if (!request) return
    clearRequest()
    stick()
    void send(request, { fresh: true })
  }, [request, clearRequest, send, stick])

  // On a phone the chatbot covers the page, so following a link from it has to reveal that page.
  // Not when leaving /ask: that redirect is what just opened the chatbot.
  const lastPath = useRef(pathname)
  useEffect(() => {
    const cameFromAsk = lastPath.current === '/ask'
    const moved = lastPath.current !== pathname
    lastPath.current = pathname
    if (moved && !cameFromAsk && window.matchMedia(PHONE).matches) closeChat()
  }, [pathname, closeChat])

  // Ready to type on opening (not on phones, where that would pop up the keyboard over the answers).
  useEffect(() => {
    if (open && view === 'chat' && !window.matchMedia(PHONE).matches) inputRef.current?.focus()
  }, [open, view])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      closeChat()
      launcherRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeChat])

  // Stop reading aloud when switching chats or closing.
  useEffect(() => () => window.speechSynthesis?.cancel(), [chat.active?.id, open])

  // The box grows with what is typed.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden'
  }, [draft, open, view])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (pending || !draft.trim()) return
    ask(draft)
    setDraft('')
  }

  const addToDraft = (text: string) => {
    const words = text.trim()
    if (words) setDraft((d) => `${d ? `${d} ` : ''}${words}`)
  }

  // Record, then send the audio to Intyoza's speech model; the text goes into the box so the person can check it.
  const toggleRecording = async () => {
    if (transcribing) return
    if (listening) {
      recorderRef.current?.stop()
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return // microphone permission refused
    }
    const rec = new MediaRecorder(stream)
    const chunks: Blob[] = []
    const timer = window.setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_RECORDING_MS)
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      window.clearTimeout(timer)
      stream.getTracks().forEach((track) => track.stop())
      setListening(false)
      const audio = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
      if (!audio.size) return
      setTranscribing(true)
      try {
        const res = await api.transcribe(audio, lang === 'rw' ? 'rw' : 'en')
        addToDraft(res.text)
      } catch {
        // voice service unavailable: the person can still type
      } finally {
        setTranscribing(false)
      }
    }
    recorderRef.current = rec
    rec.start()
    setListening(true)
  }

  const toggleMic = () => {
    // Intyoza's own speech model needs an account; guests use the browser's speech recognition when there is one.
    if (CAN_RECORD && api.hasSession()) {
      void toggleRecording()
      return
    }
    if (!SpeechRecognition) {
      setVoiceNeedsLogin(true)
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = SPEECH_LANG[lang]
    rec.interimResults = false
    rec.onresult = (e) => setDraft((d) => `${d ? `${d} ` : ''}${e.results[0][0].transcript}`)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  // Location is used for this search only: kept in memory, never saved.
  const shareLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  const panelTitle = urgent ? t('feature.services.title') : t('ask.tailorTitle')

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t('nav.ask')}
          className="chat-panel fixed right-6 bottom-24 z-70 flex h-[min(640px,calc(100dvh-112px))] w-[400px] flex-col overflow-hidden rounded-[22px] border border-brand bg-surface max-[700px]:inset-0 max-[700px]:h-dvh max-[700px]:w-full max-[700px]:rounded-none max-[700px]:border-0"
        >
          <header className="flex items-center gap-2 border-b border-line bg-brand px-3 py-2.5 text-on-brand">
            {view === 'chat' ? (
              <>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-on-brand text-brand" aria-hidden="true">
                  <Icon name="chat" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 truncate font-display text-base leading-tight text-inherit">{chat.active?.title ?? t('nav.ask')}</h2>
                  <p className="m-0 truncate text-[0.78rem] opacity-85">{t('ask.privateChat')}</p>
                </div>
                <button type="button" className="chat-head-btn" aria-label={t('ask.history')} title={t('ask.history')} onClick={() => setView('history')}>
                  <Icon name="menu" size={18} />
                </button>
                <button type="button" className="chat-head-btn" aria-label={panelTitle} title={panelTitle} onClick={() => setView('panel')}>
                  <Icon name={urgent ? 'pin' : 'user'} size={18} />
                </button>
              </>
            ) : (
              <>
                <button type="button" className="chat-head-btn" aria-label={t('common.back')} title={t('common.back')} onClick={() => setView('chat')}>
                  <Icon name="arrowLeft" size={18} />
                </button>
                <h2 className="m-0 min-w-0 flex-1 truncate font-display text-base text-inherit">{view === 'history' ? t('ask.history') : panelTitle}</h2>
              </>
            )}
            {/* The chatbot covers the site's own Quick exit on a phone. */}
            <button type="button" className="chat-head-btn min-[701px]:hidden" aria-label={t('privacy.quickExit')} title={t('privacy.quickExit')} onClick={quickExit}>
              <Icon name="eyeOff" size={18} />
            </button>
            <button type="button" className="chat-head-btn" aria-label={t('common.close')} title={t('common.close')} onClick={closeChat}>
              <Icon name="close" size={18} />
            </button>
          </header>

          {view === 'history' && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ChatSidebar
                threads={chat.threads}
                activeId={chat.active?.id}
                onNew={() => {
                  chat.newChat()
                  setView('chat')
                }}
                onSelect={(id) => {
                  chat.selectChat(id)
                  setView('chat')
                }}
                onClearAll={chat.clearAll}
              />
            </div>
          )}

          {view === 'panel' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 [&_h2]:mb-1 [&_h2]:text-[1.05rem]">
              {urgent ? (
                <ServicesPanel key={chat.active?.id} escalation={urgent} coords={coords} />
              ) : (
                <TailorPanel profile={chat.profile} onChange={chat.setProfile} onSaveAbout={(about) => void chat.saveAbout(about)} topic={topic} />
              )}
            </div>
          )}

          {view === 'chat' && (
            <>
              <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                <div aria-live="polite" className="flex min-h-full flex-col gap-4 px-4 pt-4 pb-5">
                  {messages.length === 0 && !chat.profile.aboutAnswered && (
                    <section className="rounded-[18px] border border-line p-3.5" aria-labelledby="about-title">
                      <h3 id="about-title" className="m-0 font-display text-base">
                        {t('profile.title')}
                      </h3>
                      <AboutYouForm profile={chat.profile} onSave={(about) => void chat.saveAbout(about)} onSkip={chat.skipAbout} />
                    </section>
                  )}
                  {messages.length === 0 ? (
                    <div className="my-auto flex flex-col items-center gap-1 py-4 text-center">
                      <Spot name="ask" className="size-16" />
                      <h3 className="mt-3 mb-0 font-display text-xl">{t('ask.welcome')}</h3>
                      <p className="mt-1 mb-2 text-[0.88rem] text-muted">{t('ask.welcomeHint')}</p>
                      <div className="stagger chip-row justify-center">
                        {TOPICS.map((tp) => (
                          <button key={tp} type="button" className={chipSoft} onClick={() => ask(TOPIC_STARTERS[tp])}>
                            {t(`topic.${tp}` as TKey)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="m-0 text-center text-[0.78rem] text-muted">{chat.active && formatStarted(chat.active.createdAt, lang, t('ask.today'))}</p>
                  )}

                  {/* The local guide answers in English until translated answers are available. */}
                  {lang !== 'en' && messages.length > 0 && (
                    <p className="notice notice-warn m-0 text-[0.85rem]">
                      <Icon name="globe" size={16} />
                      <span>{t('ask.langNote')}</span>
                    </p>
                  )}

                  {messages.map((m, i) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isLatest={i === messages.length - 1}
                      onFollowUp={(text) => ask(text, { suggestion: true })}
                      disabled={pending}
                      coords={coords}
                      locating={locating}
                      onUseLocation={shareLocation}
                    />
                  ))}

                  {urgent && !pending && (
                    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-3 text-[0.88rem]">
                      <Icon name={coords ? 'check' : 'pin'} size={18} className="shrink-0" />
                      <p className="m-0 min-w-[60%] flex-1">{coords ? t('ask.locationOn') : t('ask.locationAsk')}</p>
                      <div className="flex w-full flex-wrap gap-2">
                        {coords ? (
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCoords(null)}>
                            {t('ask.locationStop')}
                          </button>
                        ) : (
                          <button type="button" className="btn btn-sm btn-ghost" onClick={shareLocation} disabled={locating}>
                            {locating ? t('ask.locating') : t('ask.locationUse')}
                          </button>
                        )}
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setView('panel')}>
                          {t('ask.findServices')}
                        </button>
                      </div>
                    </div>
                  )}

                  {pending && (
                    <div className={`${msgRow} message-enter`}>
                      <span className="chat-avatar" aria-hidden="true">
                        <Icon name="chat" size={16} />
                      </span>
                      <div className={`${answerBubble} flex gap-1.5 px-[18px] py-4`} aria-label={t('ask.typing')}>
                        <span className="typing-dot size-[7px] rounded-full bg-muted" />
                        <span className="typing-dot size-[7px] rounded-full bg-muted" />
                        <span className="typing-dot size-[7px] rounded-full bg-muted" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-line px-3 pt-2.5 pb-2">
                <form
                  onSubmit={submit}
                  className="flex items-end gap-1.5 rounded-[22px] border border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-surface p-1 focus-within:outline-3 focus-within:outline-offset-1 focus-within:outline-focus"
                >
                  <div className="relative">
                    <button
                      type="button"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
                      aria-label={t('ask.topics')}
                      aria-expanded={topicsOpen}
                      onClick={() => setTopicsOpen((o) => !o)}
                    >
                      <Icon name="plus" size={18} />
                    </button>
                    {topicsOpen && (
                      <ul className="message-enter absolute bottom-[calc(100%+10px)] left-0 z-5 min-w-[200px] rounded-2xl border border-line bg-surface p-1.5">
                        {TOPICS.map((tp) => (
                          <li key={tp}>
                            <button
                              type="button"
                              className="w-full rounded-[10px] px-3 py-2 text-left text-fg hover:bg-surface-2"
                              onClick={() => {
                                setTopicsOpen(false)
                                ask(TOPIC_STARTERS[tp])
                              }}
                            >
                              {t(`topic.${tp}` as TKey)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <label htmlFor="ask-input" className="sr-only">
                    {t('ask.placeholder')}
                  </label>
                  <textarea
                    ref={inputRef}
                    id="ask-input"
                    rows={1}
                    className="min-w-0 flex-1 resize-none bg-transparent px-1 py-2 leading-6 text-fg outline-none"
                    value={draft}
                    placeholder={messages.length ? t('ask.followUpPlaceholder') : t('ask.placeholder')}
                    maxLength={1000}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        submit()
                      }
                    }}
                  />
                  {(CAN_RECORD || SpeechRecognition) && (
                    <button
                      type="button"
                      className={`grid size-10 shrink-0 place-items-center rounded-full text-muted aria-pressed:bg-brand-soft aria-pressed:text-brand ${transcribing ? 'animate-pulse' : ''}`}
                      aria-pressed={listening}
                      aria-busy={transcribing}
                      disabled={transcribing}
                      aria-label={listening ? t('ask.stopListening') : t('ask.speak')}
                      onClick={toggleMic}
                    >
                      <Icon name="mic" size={18} />
                    </button>
                  )}
                  <button type="submit" className="send-circle size-10" disabled={pending || !draft.trim()} aria-label={t('ask.send')}>
                    <Icon name="send" size={18} />
                  </button>
                </form>
                {voiceNeedsLogin && (
                  <p role="status" className="mt-1.5 mb-0 text-center text-[0.8rem] text-muted">
                    <Link to="/login?next=/ask" className="font-semibold text-brand" onClick={() => setVoiceNeedsLogin(false)}>
                      {t('voice.loginNeeded')}
                    </Link>
                  </p>
                )}
                <p className="mt-1.5 mb-0 text-center text-[0.72rem] text-muted">
                  {t('footer.short')} 912.
                </p>
              </div>
            </>
          )}
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        aria-expanded={open}
        aria-label={open ? t('common.close') : t('nav.ask')}
        onClick={open ? closeChat : openChat}
        className="chat-launcher fixed right-6 bottom-6 z-60 inline-flex h-14 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-on-brand max-[700px]:right-4 max-[700px]:bottom-[76px] max-[700px]:w-14 max-[700px]:justify-center max-[700px]:px-0"
      >
        <Icon name={open ? 'close' : 'chat'} size={22} />
        <span className="max-[700px]:hidden">{open ? t('common.close') : t('nav.ask')}</span>
      </button>
    </>
  )
}
