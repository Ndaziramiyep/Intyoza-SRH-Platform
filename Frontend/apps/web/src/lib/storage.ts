// Thin Web Storage wrappers. Storage can be unavailable (private mode, blocked
// site data), so every call fails quietly and the app keeps working.
function createStore(area: () => Storage) {
  return {
    get<T>(key: string): T | null {
      try {
        const raw = area().getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
      } catch {
        return null
      }
    },
    set(key: string, value: unknown) {
      try {
        area().setItem(key, JSON.stringify(value))
      } catch {
        /* ignore */
      }
    },
    remove(key: string) {
      try {
        area().removeItem(key)
      } catch {
        /* ignore */
      }
    },
  }
}

/** Kept on this device until removed. */
export const storage = createStore(() => localStorage)

/** Cleared when the tab is closed, used for private conversations. */
export const sessionStore = createStore(() => sessionStorage)
