import { useCallback, useEffect, useState } from 'react'
import { loadLowData, loadProgress, saveLowData, saveProgress, type Progress } from '../../lib/learn/progress'

export function useLearning() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [lowData, setLowData] = useState(loadLowData)

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => saveLowData(lowData), [lowData])

  const markDone = useCallback((id: string, score?: number, total?: number) => {
    setProgress((p) => {
      const prev = p[id]
      // Keep the best score.
      if (prev && score !== undefined && prev.score !== undefined && prev.score >= score) return p
      return { ...p, [id]: { done: true, score, total } }
    })
  }, [])

  return { progress, markDone, lowData, setLowData }
}
