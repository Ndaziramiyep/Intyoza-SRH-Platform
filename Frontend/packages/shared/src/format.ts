import { fill, type TKey } from './i18n/translations'

/** "5 min ago", "yesterday"… in the chosen language. */
export function timeAgo(iso: string, t: (key: TKey) => string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return t('time.justNow')
  if (mins < 60) return fill(t('time.minAgo'), { n: mins })
  const hours = Math.round(mins / 60)
  if (hours < 24) return fill(t('time.hoursAgo'), { n: hours })
  const days = Math.round(hours / 24)
  return days === 1 ? t('time.yesterday') : fill(t('time.daysAgo'), { n: days })
}
