import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@intyoza/shared/api/client'
import type { Lang, TKey } from '@intyoza/shared/i18n/translations'
import type { LessonText, StaffLesson } from '@intyoza/shared/learn/courses/staffTypes'
import type { CategoryTone } from '@intyoza/shared/learn/courses/types'
import type { IconName } from '../../components/Icon'
import { useLanguage } from '../../i18n/context'
import { storage } from '../../lib/storage'

// Constants and hooks shared by the staff editors.

export const LANG_NAMES: Record<Lang, string> = { rw: 'Kinyarwanda', en: 'English', fr: 'Français' }

export const fieldLabel = 'mb-1.5 block text-[0.85rem] font-semibold'
export const hint = 'mt-1 mb-0 text-[0.8rem] text-muted'

export const CATEGORY_ICONS: IconName[] = ['clock', 'shield', 'heart', 'spark', 'users', 'sun', 'phone', 'book', 'help', 'flag', 'pin', 'chat']
export const TONES: CategoryTone[] = ['brand', 'teal', 'coral', 'amber']

/** Warns before closing or reloading the tab while there are unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}

const DRAFT_PREFIX = 'intyoza.staff.draft.'

/**
 * Keeps unsaved editor changes on this device as they are typed, so nothing is lost when the tab
 * closes or the staff member opens another page. `restored` is the draft found on opening, if it
 * differs from the saved version. Saving or discarding removes it.
 */
export function useLocalDraft<T>(key: string, value: T | null, dirty: boolean) {
  const storeKey = DRAFT_PREFIX + key
  const [restored] = useState<T | null>(() => storage.get<T>(storeKey))

  useEffect(() => {
    if (value === null) return
    if (!dirty) {
      storage.remove(storeKey)
      return
    }
    const timer = setTimeout(() => storage.set(storeKey, value), 600)
    return () => clearTimeout(timer)
  }, [storeKey, value, dirty])

  const clear = useCallback(() => storage.remove(storeKey), [storeKey])
  return { restored, clear }
}

/** The lesson text in a language, with empty screens matching the English ones to fill in. */
export function textIn(lesson: StaffLesson, lang: Lang): LessonText {
  const existing = lesson.text[lang]
  if (existing) return existing
  const en = lesson.text.en
  return { title: '', screens: lesson.type === 'article' ? (en?.screens ?? ['']).map(() => '') : [], transcript: '' }
}

const KNOWN_RULES = ['MISSING_LANGUAGES', 'NOT_IN_REVIEW', 'NOT_APPROVED', 'COMMENT_REQUIRED', 'CATEGORY_HAS_COURSES', 'NOT_FOUND']

/** The message for a refused change: the rule that refused it, when the server says which. */
export function useRuleMessage() {
  const { t } = useLanguage()
  return (err: unknown) => {
    const code = (err as { code?: string } | null)?.code
    if (code && KNOWN_RULES.includes(code)) return t(`staff.error.${code}` as TKey)
    if (err instanceof ApiError && err.status === 403) return t('staff.error.FORBIDDEN')
    return t('staff.saveError')
  }
}
