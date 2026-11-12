import { Navigate, useParams } from 'react-router-dom'
import { courseLessonForItem } from '@intyoza/shared/learn/courses/sampleClient'
import { LEARN_SOURCE } from '../../../lib/learn/courseClient'
import { LearnItemPage } from '../LearnItemPage'

/**
 * /learn/:id, the address of a lesson before courses existed. A built-in lesson now lives inside a
 * course, so the link opens it there; anything else (an article published from the backend) keeps
 * its own page.
 */
export function LegacyLessonRoute() {
  const { id = '' } = useParams()
  const target = LEARN_SOURCE === 'sample' ? courseLessonForItem(id) : undefined
  if (target) return <Navigate to={`/learn/courses/${target.slug}/lessons/${target.lessonId}`} replace />
  return <LearnItemPage />
}
