import { useCallback, useState } from 'react'
import { EMPTY_STATS, addRound, type GameStats } from '@intyoza/shared/myths/game'
import { preferenceStorage } from '../../lib/privacy/consent'

// Kept like other preferences: on this browser only if the person allowed it, otherwise for this tab.
const KEY = 'intyoza.myths.game'

export function useGameStats() {
  const [stats, setStats] = useState<GameStats>(() => preferenceStorage.get<GameStats>(KEY) ?? EMPTY_STATS)

  const finishRound = useCallback((rightIds: string[], bestStreak: number) => {
    setStats((prev) => {
      const next = addRound(prev, rightIds, bestStreak)
      preferenceStorage.set(KEY, next)
      return next
    })
  }, [])

  return { stats, finishRound }
}
