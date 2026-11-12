import { sessionStore, storage } from '../storage'

// No accounts: Intyoza only remembers things on this browser, and only what the
// person allows. "Essential" (this choice + an anonymous id) is always kept.

export type Consent = {
  /** Keep chats after the tab is closed. */
  chats: boolean
  /** Keep language, age range, theme and low-data mode. */
  preferences: boolean
  /** Anonymous usage counts. Nothing is sent in the UI-only build. */
  stats: boolean
}

export const ACCEPT_ALL: Consent = { chats: true, preferences: true, stats: true }
export const ESSENTIAL_ONLY: Consent = { chats: false, preferences: false, stats: false }

const CONSENT_KEY = 'intyoza.consent'
const ID_COOKIE = 'intyoza_id'

export const CHAT_KEYS = ['intyoza.chats', 'intyoza.session', 'intyoza.account']
export const PREFERENCE_KEYS = ['intyoza.lang', 'intyoza.profile', 'intyoza.theme', 'intyoza.lowData', 'intyoza.myths.game']

/** null until the person has answered the cookie banner. */
export function loadConsent(): Consent | null {
  return storage.get<Consent>(CONSENT_KEY)
}

/** Saves the choice and moves remembered data between this tab and this browser to match it. */
export function saveConsent(consent: Consent) {
  storage.set(CONSENT_KEY, consent)
  moveKeys(CHAT_KEYS, consent.chats)
  moveKeys(PREFERENCE_KEYS, consent.preferences)
}

function moveKeys(keys: string[], keep: boolean) {
  const [from, to] = keep ? [sessionStore, storage] : [storage, sessionStore]
  for (const key of keys) {
    const value = from.get(key)
    if (value !== null) to.set(key, value)
    from.remove(key)
  }
}

/** Storage for a group of keys: this browser if allowed, otherwise only this tab. */
function storeFor(group: keyof Pick<Consent, 'chats' | 'preferences'>) {
  return () => (loadConsent()?.[group] ? storage : sessionStore)
}

const scoped = (area: () => typeof storage) => ({
  get: <T>(key: string) => area().get<T>(key) ?? sessionStore.get<T>(key),
  set: (key: string, value: unknown) => area().set(key, value),
  remove: (key: string) => {
    storage.remove(key)
    sessionStore.remove(key)
  },
})

export const chatStorage = scoped(storeFor('chats'))
export const preferenceStorage = scoped(storeFor('preferences'))

/** Random, anonymous code for this browser. No name, phone or email is ever linked to it. */
export function ensureAnonymousId() {
  if (document.cookie.split('; ').some((c) => c.startsWith(`${ID_COOKIE}=`))) return
  const id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  document.cookie = `${ID_COOKIE}=${id}; max-age=31536000; path=/; SameSite=Lax`
}

/** Wipes everything Intyoza has stored on this browser, including the cookie choice. */
export function clearAllData() {
  for (const area of [localStorage, sessionStorage]) {
    try {
      Object.keys(area)
        .filter((k) => k.startsWith('intyoza.'))
        .forEach((k) => area.removeItem(k))
    } catch {
      /* storage unavailable */
    }
  }
  document.cookie = `${ID_COOKIE}=; max-age=0; path=/`
}

/** Leaves the app instantly and replaces this page in history. */
export function quickExit() {
  window.location.replace('https://www.google.com/search?q=weather')
}
