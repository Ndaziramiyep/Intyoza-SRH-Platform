import type { Lang } from '@intyoza/shared/i18n/translations'
import type { StaffLesson } from '@intyoza/shared/learn/courses/staffTypes'

// What changed between two versions of a lesson, line by line, for the versions panel.

/** A lesson in one language as labelled lines ("Screen 2: …"), so a diff reads like a list of changes. */
export function lessonLines(lesson: StaffLesson, lang: Lang): string[] {
  const text = lesson.text[lang]
  const lines: string[] = [`Title: ${text?.title ?? ''}`]
  if (lesson.type === 'article') (text?.screens ?? []).forEach((s, i) => lines.push(`Screen ${i + 1}: ${s}`))
  if (lesson.type === 'audio' || lesson.type === 'video') {
    lines.push(`File: ${lesson.media?.url ? `${lesson.media.sizeMb} MB` : 'none'}`)
    for (const paragraph of (text?.transcript ?? '').split(/\n+/).filter(Boolean)) lines.push(`Transcript: ${paragraph}`)
  }
  lesson.questions.forEach((q, i) => {
    const t = q.text[lang]
    lines.push(`Question ${i + 1} (${q.use}): ${t?.question ?? ''}`)
    t?.options.forEach((o, j) => lines.push(`Question ${i + 1}, option ${j + 1}${j === q.correctIndex ? ' (correct)' : ''}: ${o}`))
    lines.push(`Question ${i + 1}, explanation: ${t?.explanation ?? ''}`)
  })
  lesson.cards.forEach((c, i) => {
    const t = c.text[lang]
    lines.push(`Card ${i + 1} (${c.isMyth ? 'myth' : 'fact'}): ${t?.statement ?? ''}`)
    lines.push(`Card ${i + 1}, explanation: ${t?.explanation ?? ''}`)
  })
  return lines
}

export type DiffLine = { kind: 'same' | 'removed' | 'added'; text: string }

/** A line diff (longest common subsequence). Lessons are short, so the simple table is fine. */
export function diffLines(before: string[], after: string[]): DiffLine[] {
  const n = before.length
  const m = after.length
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push({ kind: 'same', text: before[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ kind: 'removed', text: before[i++] })
    else out.push({ kind: 'added', text: after[j++] })
  }
  while (i < n) out.push({ kind: 'removed', text: before[i++] })
  while (j < m) out.push({ kind: 'added', text: after[j++] })
  return out
}
