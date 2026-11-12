import { useCallback, useEffect, useState } from 'react'

export type QueryState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown }
  | { status: 'success'; data: T; error?: undefined }

type Settled<T> = { key: string; status: 'success'; data: T } | { key: string; status: 'error'; error: unknown }

/**
 * Runs `load` and tracks its state, for the Learning Hub screens. Runs again when `deps` change or
 * `reload()` is called. Each result remembers which request it answers, so the screen shows
 * "loading" until the latest request is back: a slow answer never shows the wrong course.
 *
 * `deps` are the plain values `load` reads (ids, language), like a cache key.
 */
export function useLearnQuery<T>(load: () => Promise<T>, deps: (string | number | boolean | undefined)[]) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const key = JSON.stringify([...deps, attempt])

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setSettled({ key, status: 'success', data }),
      (error: unknown) => active && setSettled({ key, status: 'error', error }),
    )
    return () => {
      active = false
    }
    // `key` stands for everything `load` reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  return { ...stateOf(settled, key), reload }
}

function stateOf<T>(settled: Settled<T> | null, key: string): QueryState<T> {
  if (!settled || settled.key !== key) return { status: 'loading' }
  return settled.status === 'success' ? { status: 'success', data: settled.data } : { status: 'error', error: settled.error }
}
