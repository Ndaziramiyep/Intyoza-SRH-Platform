import { useEffect, useState } from 'react'
import { apiLanguage, type ApiMyth, type IntyozaApi } from '../api/client'
import type { Lang } from '../i18n/translations'
import { MYTHS, type Myth } from './data'

/**
 * The backend keeps a belief and the fact that answers it, so every published one is treated as a
 * myth. It has no topic, why-people-believe-it or when-to-get-care, so screens leave those out.
 */
function mythFromApi(m: ApiMyth): Myth {
  return {
    id: m.id,
    claim: m.mythText,
    verdict: 'myth',
    keywords: [],
    truth: m.factText,
    whyBelieved: '',
    seekCare: '',
    sources: m.sources,
  }
}

const words = (text: string) => new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((w) => w.length > 2) ?? [])

/** True when two beliefs share most of their words ("You can't get pregnant the first time…"). */
function sameBelief(a: string, b: string) {
  const x = words(a)
  const y = words(b)
  if (!x.size || !y.size) return false
  let shared = 0
  for (const w of x) if (y.has(w)) shared++
  return shared / Math.min(x.size, y.size) >= 0.6
}

/** Published myths first, then the built-in ones that say something different. */
export function mergeMyths(published: Myth[], builtIn: Myth[] = MYTHS): Myth[] {
  return [...published, ...builtIn.filter((m) => !published.some((p) => sameBelief(p.claim, m.claim)))]
}

/**
 * Every myth to show: the ones admins publish (GET /myths, in the chosen language) together with
 * those built into the app, which carry topics and true/false facts for the game. Offline, or
 * before anything is published, only the built-in ones.
 */
export function useMyths(api: IntyozaApi | undefined, lang: Lang) {
  const [published, setPublished] = useState<Myth[]>([])

  useEffect(() => {
    if (!api) return
    let active = true
    api
      .myths(apiLanguage(lang))
      .then((myths) => {
        if (active) setPublished(myths.map(mythFromApi))
      })
      .catch(() => {
        if (active) setPublished([])
      })
    return () => {
      active = false
    }
  }, [api, lang])

  return { myths: published.length ? mergeMyths(published) : MYTHS, published, isLive: published.length > 0 }
}
