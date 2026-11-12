/** Minimal synchronous key-value storage that each app provides (browser storage, device storage…). */
export type KeyValueStore = {
  get<T>(key: string): T | null
  set(key: string, value: unknown): void
  remove(key: string): void
}
