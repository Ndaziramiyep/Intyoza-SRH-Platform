import type { IconName } from '../../components/Icon'
import type { Format } from '@intyoza/shared/learn/types'

// Labels are translated with the `format.<id>` keys.
export const FORMATS: Record<Format, { icon: IconName }> = {
  article: { icon: 'book' },
  video: { icon: 'play' },
  audio: { icon: 'headphones' },
  quiz: { icon: 'check' },
  'myth-fact': { icon: 'help' },
}
