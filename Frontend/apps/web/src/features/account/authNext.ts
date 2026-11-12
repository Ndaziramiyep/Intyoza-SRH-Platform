import { useSearchParams } from 'react-router-dom'

/** Only paths inside the app, so a link can't send someone elsewhere after logging in. */
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

/** Where to go once logged in (?next=…), and the same ?next= for links between log in and sign up. */
export function useAuthNext() {
  const [params] = useSearchParams()
  const raw = params.get('next')
  return { next: safeNext(raw), query: raw ? `?next=${encodeURIComponent(raw)}` : '' }
}
