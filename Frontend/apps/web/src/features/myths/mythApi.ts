// Myth Buster calls to the backend. Both are anonymous: no account, no token, no user id is sent.
// Until the backend has these endpoints the calls fail quietly and the page simply hides what needs them.
const root = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export type AnswerCounts = { true: number; false: number; partly: number; total: number }
export type Answer = 'TRUE' | 'FALSE' | 'PARTLY'

/** Removes phone numbers, emails and links, so a rumour never carries someone's contact details. */
export function cleanRumour(text: string) {
  return text
    .replace(/\S+@\S+\.\S+/g, '[…]')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[…]')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[…]')
    .trim()
    .slice(0, 300)
}

/** "Heard something else?": sends a rumour for admins to review. Returns false when it could not be sent. */
export async function sendRumour(text: string, language: string): Promise<boolean> {
  try {
    const res = await fetch(`${root}/api/v1/myths/rumours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanRumour(text), language: language.toUpperCase() }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Adds one anonymous answer to the counts and returns them, or null when counts are not available. */
export async function recordAnswer(mythId: string, answer: Answer): Promise<AnswerCounts | null> {
  try {
    const res = await fetch(`${root}/api/v1/myths/${encodeURIComponent(mythId)}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { counts?: AnswerCounts }
    return body.counts && body.counts.total > 0 ? body.counts : null
  } catch {
    return null
  }
}
