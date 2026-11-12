import { preferenceStorage } from '../privacy/consent'
import { storage } from '../storage'

const PROGRESS_KEY = 'intyoza.learn.progress'
const LOW_DATA_KEY = 'intyoza.lowData'

/** Item id → best score (quizzes/activities) or 1 for a finished article/media. */
export type Progress = Record<string, { done: true; score?: number; total?: number }>

export function loadProgress(): Progress {
  return storage.get<Progress>(PROGRESS_KEY) ?? {}
}

export function saveProgress(p: Progress) {
  storage.set(PROGRESS_KEY, p)
}

export function loadLowData(): boolean {
  // Default to low-data on connections that ask the browser to save data.
  const saved = preferenceStorage.get<boolean>(LOW_DATA_KEY)
  if (saved !== null) return saved
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(conn?.saveData)
}

export function saveLowData(value: boolean) {
  preferenceStorage.set(LOW_DATA_KEY, value)
}
