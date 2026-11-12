import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiLanguage, type ApiUser, type ProfileUpdate } from '@intyoza/shared/api/client'
import { useLanguage } from '../../i18n/context'
import { api, SIGNED_OUT_EVENT } from '../../lib/api'
import { loadAccount, saveAccount, shareProfile, type AccountState } from '../../lib/account'
import { AccountContext, type RegisterInput } from './context'

const toAccount = (user: ApiUser): AccountState => ({ mode: 'account', user: { id: user.id, email: user.email, alias: user.alias } })

/**
 * Everyone starts as a guest (anonymous, no account) and can log in or register from the header.
 * The account is remembered on this browser until logging out.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage()
  // An account without its token (e.g. removed with the browser data) is no longer logged in.
  const [account, setAccount] = useState<AccountState | null>(() => {
    const saved = loadAccount()
    return saved?.mode === 'account' && api.hasSession() ? saved : null
  })
  const [user, setUser] = useState<ApiUser | null>(null)

  const update = useCallback((next: AccountState | null) => {
    saveAccount(next)
    setAccount(next)
  }, [])

  const signedIn = useCallback(
    (next: ApiUser) => {
      setUser(next)
      update(toAccount(next))
      // Age and sex from the account tailor the answers too.
      shareProfile({ ageBand: next.ageBand, ...(next.gender ? { gender: next.gender } : {}), aboutAnswered: true })
    },
    [update],
  )

  // Loads the profile once, which also checks that the login is still valid.
  useEffect(() => {
    if (account?.mode !== 'account') return
    api.me().then(signedIn, () => undefined)
    // Only on the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The server refused the token (expired): back to being a guest.
  useEffect(() => {
    const onSignedOut = () => {
      setUser(null)
      update(null)
    }
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut)
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut)
  }, [update])

  const login = useCallback(async (email: string, password: string) => signedIn(await api.login(email, password)), [signedIn])

  // Every field POST /auth/register accepts: email and password, then the optional age, sex,
  // district and language (left out when not chosen, so the backend keeps its defaults).
  const register = useCallback(
    async (input: RegisterInput) => {
      signedIn(
        await api.register({
          email: input.email,
          password: input.password,
          language: input.language ?? apiLanguage(lang),
          ...(input.ageBand && input.ageBand !== 'UNKNOWN' ? { ageBand: input.ageBand } : {}),
          ...(input.gender ? { gender: input.gender } : {}),
          ...(input.district ? { district: input.district } : {}),
        }),
      )
    },
    [lang, signedIn],
  )

  const completeGoogleLogin = useCallback(
    async (token: string) => {
      api.setToken(token)
      try {
        signedIn(await api.me())
      } catch (err) {
        api.signOut()
        throw err
      }
    },
    [signedIn],
  )

  const updateProfile = useCallback(
    async (input: ProfileUpdate) => {
      const next = await api.updateProfile(input)
      setUser(next)
      update(toAccount(next))
      shareProfile({ ageBand: next.ageBand, ...(next.gender ? { gender: next.gender } : {}) })
    },
    [update],
  )

  const logout = useCallback(() => {
    api.signOut()
    setUser(null)
    update(null)
  }, [update])

  const value = useMemo(
    () => ({ account, user, login, register, completeGoogleLogin, updateProfile, logout }),
    [account, user, login, register, completeGoogleLogin, updateProfile, logout],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
