import type { AgeBand, Gender } from '../chat/types'
import type { Lang } from '../i18n/translations'
import type { KeyValueStore } from '../storage'

// Typed client for the Intyoza backend (backend/src/routes, docs at /api-docs). The user-facing endpoints:
//   GET   /health                          server status
//   GET   /api/v1                          API name and version
//   POST  /api/v1/auth/register            new account (email + password) -> user + token
//   POST  /api/v1/auth/login               email + password -> user + token
//   GET   /api/v1/auth/google              Google sign-in; ends on <frontend>/auth/success?token=…
//   GET   /api/v1/auth/me                  the logged-in user                        (login)
//   PATCH /api/v1/auth/profile             alias, age, sex, district, language       (login)
//   POST  /api/v1/ai/chat                  ask the trained Intyoza model             (guests too)
//   POST  /api/v1/ai/transcribe            recorded voice question -> text            (login)
//   GET   /api/v1/facilities               health facilities (services/api.ts)
//   GET   /api/v1/learning/...             lesson categories and articles
//   GET   /api/v1/myths                    myths and the facts that answer them
//   *     /api/v1/community/...            groups, posts, comments, reports           (login)
//   *     /api/v1/professionals/referrals  ask a health professional to call back     (login)
// There are no anonymous accounts: someone who stays anonymous is a guest, with no token.

const SESSION_KEY = 'intyoza.session'

export type ApiLanguage = 'EN' | 'RW'

/** Details that can be given with a new account or a profile update. Everything is optional. */
export type SessionDetails = { language?: ApiLanguage; ageBand?: AgeBand; gender?: Gender; district?: string; province?: string }

export type ApiUser = {
  id: string
  email?: string | null
  /** Community username. */
  alias?: string | null
  language: ApiLanguage
  ageBand: AgeBand
  gender?: Gender
  district?: string | null
  /** HEALTH_REVIEWER and TRANSLATOR are the Learning Hub staff roles proposed in the plan. */
  role?: 'USER' | 'MODERATOR' | 'ADMIN' | 'HEALTH_REVIEWER' | 'TRANSLATOR'
  oauthProvider?: string | null
  createdAt: string
}

export type ProfileUpdate = { alias?: string; ageBand?: AgeBand; gender?: Gender; district?: string; language?: ApiLanguage }

export type ReferralStatus = 'PENDING' | 'CONTACTED' | 'RESOLVED' | 'CANCELLED'

export type ApiReferral = {
  id: string
  contactMethod: string
  topic: string | null
  status: ReferralStatus
  /** Written by the health worker or admin handling the request (shown to the person who asked). */
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type ApiHealth = { status: string; uptime: number; timestamp: string; version: string }
export type ApiInfo = { name: string; version: string }

/**
 * What the trained model decided: answer | not_sure | safe | refuse | off_topic | small_talk.
 * system_error: the AI service could not be reached; the reply is only an apology.
 */
export type AiReplyType = 'answer' | 'not_sure' | 'safe' | 'refuse' | 'off_topic' | 'small_talk' | 'system_error'

/**
 * POST /ai/chat. When the AI service is down the backend still answers 200: for an account with
 * type 'system_error', for a guest with only sessionId, reply, escalate and isGuest. So everything
 * past `escalate` can be missing.
 */
export type AiChatResponse = {
  /** null for a guest who sent no session id. */
  sessionId: string | null
  reply: string
  /** True for crisis, abuse, emergency or diagnosis requests: the reply carries helplines. */
  escalate: boolean
  escalateReason?: 'self_harm' | 'abuse_disclosure' | 'medical_emergency' | 'diagnosis_request' | string | null
  sources?: string[]
  type?: AiReplyType | null
  title?: string | null
  topic?: string | null
  suggestions?: string[]
  disclaimer?: string | null
  bestGuess?: boolean
  confidence?: number | null
  /** True when answered without an account (nothing is saved). */
  isGuest?: boolean
}

/** The backend's apology when the AI service is down, rather than a real answer. */
export const isAiUnavailable = (res: AiChatResponse) =>
  res.type === 'system_error' || (res.isGuest === true && res.sources === undefined && res.suggestions === undefined)

export type ApiAvailability = 'YES' | 'LIKELY' | 'NO' | 'UNKNOWN'

export type ApiFacility = {
  id: string
  name: string
  facilityType: string | null
  ownership: 'PUBLIC' | 'FAITH_BASED' | 'PRIVATE' | 'UNKNOWN'
  province: string | null
  district: string
  sector: string | null
  cell: string | null
  address: string | null
  latitude: number
  longitude: number
  phone: string | null
  openingHours: string | null
  isYouthFriendly: ApiAvailability
  isIsange: ApiAvailability
  /** Null until someone has checked the listing. */
  verifiedAt: string | null
  services: { id: string; facilityId: string; serviceName: string; status: ApiAvailability; costType: 'FREE' | 'SUBSIDIZED' | 'PAID' | 'UNKNOWN' }[]
}

export type ApiCategory = { id: string; slug: string; nameEn: string; nameRw: string }

export type ApiArticle = {
  id: string
  title: string
  format: 'ARTICLE' | 'VIDEO' | 'AUDIO' | 'QUIZ'
  isLowData: boolean
  language: ApiLanguage
  categoryId: string
  /** Only when one article is fetched, not in the list. */
  content?: string
  category?: ApiCategory
}

export type ApiMyth = { id: string; language: ApiLanguage; mythText: string; factText: string; sources: string[] }

export type ApiCommunitySpace = {
  id: string
  name: string
  description: string
  imageUrl: string | null
  isModerated: boolean
  moderatorId: string | null
  moderator: { id: string; alias: string | null } | null
  _count: { posts: number }
}

export type ApiCommunityPost = {
  id: string
  spaceId: string
  userId: string
  content: string
  createdAt: string
  user: { id: string; alias: string | null }
  _count: { comments: number; reports: number }
}

export type ApiCommunityComment = {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: string
  user: { id: string; alias: string | null }
}

/** Text recognised from a recorded question. */
export type AiTranscription = { text: string; language: string; seconds: number | null }

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** The backend only knows English and Kinyarwanda. */
export const apiLanguage = (lang: Lang): ApiLanguage => (lang === 'rw' ? 'RW' : 'EN')

type Options = {
  /** e.g. "https://api.intyoza.rw". Empty = same origin (the Vite dev server proxies /api and /health). */
  baseUrl: string
  /** Where the login token is kept. */
  storage: KeyValueStore
  /** Called when the server no longer accepts the token (expired or removed account). */
  onSignedOut?: () => void
}

export type IntyozaApi = ReturnType<typeof createApi>

/** Thrown before calling an endpoint that needs an account when nobody is logged in. */
export const loginRequired = () => new ApiError(401, 'LOGIN_REQUIRED', 'Log in to continue')

export const isLoginRequired = (err: unknown) =>
  err instanceof ApiError && (err.code === 'LOGIN_REQUIRED' || err.code === 'UNAUTHORIZED')

/** A conversation id for a guest, so the AI service keeps each guest chat apart. Never a UUID. */
const guestSessionId = () =>
  `guest-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`

export function createApi({ baseUrl, storage, onSignedOut }: Options) {
  const root = baseUrl.replace(/\/$/, '')
  const token = () => storage.get<string>(SESSION_KEY)

  async function send<T>(path: string, init: RequestInit & { headers?: Record<string, string> }, auth: boolean): Promise<T> {
    const headers: Record<string, string> = { ...init.headers }
    const current = token()
    if (auth && current) headers.Authorization = `Bearer ${current}`
    let res: Response
    try {
      res = await fetch(`${root}${path}`, { ...init, headers })
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached')
    }
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      // A token the server refuses is of no more use: forget it (unless another login replaced it).
      if (auth && current && res.status === 401 && token() === current) {
        storage.remove(SESSION_KEY)
        onSignedOut?.()
      }
      throw new ApiError(res.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? res.statusText)
    }
    return body as T
  }

  const request = <T>(path: string, init: RequestInit = {}, auth = false) =>
    send<T>(path, { ...init, headers: { 'Content-Type': 'application/json' } }, auth)

  const post = <T>(path: string, data: unknown, auth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }, auth)

  /** For endpoints that need an account: fails at once, without a call, when nobody is logged in. */
  const authed = <T>(path: string, init: RequestInit = {}) => {
    if (!token()) return Promise.reject(loginRequired())
    return request<T>(path, init, true)
  }
  const authedPost = <T>(path: string, data: unknown) => authed<T>(path, { method: 'POST', body: JSON.stringify(data) })

  const keepToken = (res: { user: ApiUser; token: string }) => {
    storage.set(SESSION_KEY, res.token)
    return res.user
  }

  const api = {
    health: () => request<ApiHealth>('/health'),
    info: () => request<ApiInfo>('/api/v1'),
    facilities: (district?: string) =>
      request<{ facilities: ApiFacility[] }>(`/api/v1/facilities${district ? `?district=${encodeURIComponent(district)}` : ''}`).then((r) => r.facilities),
    learningCategories: () => request<{ categories: ApiCategory[] }>('/api/v1/learning/categories').then((r) => r.categories),
    articles: (filters: { language?: ApiLanguage; isLowData?: boolean; categoryId?: string } = {}) => {
      const query = new URLSearchParams(Object.entries(filters).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]]))).toString()
      return request<{ articles: ApiArticle[] }>(`/api/v1/learning/articles${query ? `?${query}` : ''}`).then((r) => r.articles)
    },
    article: (id: string) => request<{ article: ApiArticle }>(`/api/v1/learning/articles/${encodeURIComponent(id)}`).then((r) => r.article),
    myths: (language?: ApiLanguage) => request<{ myths: ApiMyth[] }>(`/api/v1/myths${language ? `?language=${language}` : ''}`).then((r) => r.myths),

    // --- Account ---
    /** Logs in and keeps the token. */
    login: (email: string, password: string) =>
      post<{ user: ApiUser; token: string }>('/api/v1/auth/login', { email, password }).then(keepToken),
    /** Creates an account, logs in with it and keeps the token. */
    register: (input: { email: string; password: string } & SessionDetails) =>
      post<{ user: ApiUser; token: string }>('/api/v1/auth/register', input).then(keepToken),
    /** Where to send the browser to sign in with Google. It comes back to /auth/success?token=… */
    googleLoginUrl: () => `${root}/api/v1/auth/google`,
    /** Keeps a token received from Google sign-in. */
    setToken: (value: string) => storage.set(SESSION_KEY, value),
    me: () => authed<{ user: ApiUser }>('/api/v1/auth/me').then((r) => r.user),
    updateProfile: (input: ProfileUpdate) =>
      authed<{ user: ApiUser }>('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(input) }).then((r) => r.user),
    hasSession: () => Boolean(token()),
    /** Calls an endpoint that needs an account, for feature clients with their own module (Learning Hub). */
    callAuthed: <T>(path: string, init: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}) =>
      authed<T>(path, { method: init.method ?? 'GET', ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }) }),
    /** Like callAuthed but with the raw body and response, for file uploads and downloads. */
    async fetchAuthed(path: string, init: RequestInit = {}): Promise<Response> {
      const current = token()
      if (!current) throw loginRequired()
      let res: Response
      try {
        res = await fetch(`${root}${path}`, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${current}` } })
      } catch {
        throw new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached')
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new ApiError(res.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? res.statusText)
      }
      return res
    },
    signOut: () => storage.remove(SESSION_KEY),

    // --- Health professionals ---
    referrals: () => authed<{ referrals: ApiReferral[] }>('/api/v1/professionals/referrals').then((r) => r.referrals),
    requestReferral: (input: { contactMethod: string; topic?: string }) =>
      authedPost<{ referral: ApiReferral }>('/api/v1/professionals/referrals', input).then((r) => r.referral),

    // --- Community (account needed) ---
    communityUser: () => api.me(),
    communitySpaces: () => authed<{ spaces: ApiCommunitySpace[] }>('/api/v1/community/spaces').then((r) => r.spaces),
    communityPosts: (spaceId: string) =>
      authed<{ posts: ApiCommunityPost[] }>(`/api/v1/community/spaces/${encodeURIComponent(spaceId)}/posts`).then((r) => r.posts),
    communityComments: (postId: string) =>
      authed<{ comments: ApiCommunityComment[] }>(`/api/v1/community/posts/${encodeURIComponent(postId)}/comments`).then((r) => r.comments),
    createCommunityPost: (spaceId: string, content: string) =>
      authedPost<unknown>(`/api/v1/community/spaces/${encodeURIComponent(spaceId)}/posts`, { content }),
    createCommunityComment: (postId: string, content: string) =>
      authedPost<unknown>(`/api/v1/community/posts/${encodeURIComponent(postId)}/comments`, { content }),
    reportCommunityPost: (postId: string, reason: string) => authedPost<unknown>('/api/v1/community/report', { postId, reason }),

    // --- AI ---
    /**
     * Asks the trained model, as the logged-in user (chats are saved to the account) or as a guest
     * (nothing is saved; a guest id keeps each conversation apart). Recovers once from an expired
     * token or a chat the server no longer has.
     */
    async chat(input: { message: string; sessionId?: string; suggestion?: boolean }): Promise<AiChatResponse> {
      const ask = (sessionId: string | undefined) => {
        const loggedIn = Boolean(token())
        const id = loggedIn ? (sessionId?.startsWith('guest-') ? undefined : sessionId) : (sessionId ?? guestSessionId())
        return post<AiChatResponse>('/api/v1/ai/chat', { ...input, sessionId: id }, loggedIn)
      }
      try {
        return await ask(input.sessionId)
      } catch (err) {
        if (!(err instanceof ApiError)) throw err
        // 401: the token was just forgotten, so this asks again as a guest.
        if (err.status === 401 || err.code === 'SESSION_NOT_FOUND') return ask(undefined)
        throw err
      }
    },

    /**
     * Sends a recorded voice question and returns the recognised text (account needed).
     * The audio goes to Intyoza's own speech model, through the backend, not to an outside company.
     */
    transcribe(audio: Blob, lang: 'rw' | 'en'): Promise<AiTranscription> {
      if (!token()) return Promise.reject(loginRequired())
      return send<AiTranscription>(
        `/api/v1/ai/transcribe?lang=${lang}`,
        { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/webm' }, body: audio },
        true,
      )
    },
  }
  return api
}
