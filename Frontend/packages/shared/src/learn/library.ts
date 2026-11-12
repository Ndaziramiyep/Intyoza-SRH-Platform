import { useEffect, useState } from 'react'
import { apiLanguage, type ApiArticle, type ApiCategory, type IntyozaApi } from '../api/client'
import type { Lang } from '../i18n/translations'
import { CATEGORIES, LEARN_ITEMS } from './content'
import type { LearnCategory, LearnItem, Localized } from './types'

const WORDS_PER_MINUTE = 200

const inLanguage = (text: string, language: ApiArticle['language']): Localized =>
  language === 'RW' ? { en: text, rw: text } : { en: text }

function categoryFromApi(c: ApiCategory): LearnCategory {
  const known = CATEGORIES.find((k) => k.id === c.slug)
  return { id: c.id, title: { en: c.nameEn, rw: c.nameRw }, icon: known?.icon ?? 'book', tone: known?.tone ?? 'brand' }
}

/** The list has no text, so summary and reading time are empty until the article itself is opened. */
function itemFromApi(a: ApiArticle): LearnItem {
  const content = a.content ?? ''
  const firstLine = content.split('\n').find((line) => line.trim())?.trim() ?? ''
  return {
    id: a.id,
    category: a.categoryId,
    // The backend has no video link or quiz questions yet, so every article is read as text.
    format: 'article',
    title: inLanguage(a.title, a.language),
    summary: inLanguage(firstLine, a.language),
    minutes: content ? Math.max(1, Math.ceil(content.split(/\s+/).length / WORDS_PER_MINUTE)) : 0,
    body: content ? inLanguage(content, a.language) : undefined,
  }
}

export type LearnLibrary = { items: LearnItem[]; categories: LearnCategory[]; isLive: boolean }

const BUILT_IN: LearnLibrary = { items: LEARN_ITEMS, categories: CATEGORIES, isLive: false }

/** Articles published in the CMS. Until there are any, or offline, the lessons built into the app. */
export function useLearnLibrary(api: IntyozaApi | undefined, lang: Lang): LearnLibrary {
  const [library, setLibrary] = useState<LearnLibrary>(BUILT_IN)

  useEffect(() => {
    if (!api) return
    let active = true
    Promise.all([api.learningCategories(), api.articles({ language: apiLanguage(lang) })])
      .then(([categories, articles]) => {
        if (!active) return
        setLibrary(
          articles.length > 0 ? { items: articles.map(itemFromApi), categories: categories.map(categoryFromApi), isLive: true } : BUILT_IN,
        )
      })
      .catch(() => {
        if (active) setLibrary(BUILT_IN)
      })
    return () => {
      active = false
    }
  }, [api, lang])

  return library
}

/** One lesson with everything needed to show it: built in, or fetched by its id. */
export function useLearnItem(api: IntyozaApi | undefined, id: string | undefined) {
  const builtIn = LEARN_ITEMS.find((i) => i.id === id)
  const [live, setLive] = useState<{ id: string; item: LearnItem; category?: LearnCategory } | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)

  useEffect(() => {
    if (!api || !id || builtIn) return
    let active = true
    api
      .article(id)
      .then((article) => {
        if (active) setLive({ id, item: itemFromApi(article), category: article.category ? categoryFromApi(article.category) : undefined })
      })
      .catch(() => {
        if (active) setFailedId(id)
      })
    return () => {
      active = false
    }
  }, [api, id, builtIn])

  if (builtIn) return { item: builtIn, category: CATEGORIES.find((c) => c.id === builtIn.category), loading: false }
  if (live && live.id === id) return { item: live.item, category: live.category, loading: false }
  return { item: undefined, category: undefined, loading: Boolean(api && id) && failedId !== id }
}
