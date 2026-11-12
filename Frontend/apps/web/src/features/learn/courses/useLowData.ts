import { useEffect, useState } from 'react'
import { loadLowData, saveLowData } from '../../../lib/learn/progress'

/**
 * Low-data mode, shared with the rest of the Learning Hub: on by default when the browser asks to
 * save data, and remembered when the person allows preferences to be saved.
 */
export function useLowData() {
  const [lowData, setLowData] = useState(loadLowData)
  useEffect(() => saveLowData(lowData), [lowData])
  return [lowData, setLowData] as const
}
