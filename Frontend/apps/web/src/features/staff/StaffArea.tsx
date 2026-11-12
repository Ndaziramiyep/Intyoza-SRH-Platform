import { Route, Routes } from 'react-router-dom'
import { RequireRole } from './RequireRole'
import { StaffCategoriesPage } from './StaffCategoriesPage'
import { StaffCourseEditorPage } from './StaffCourseEditor'
import { StaffCoursesPage } from './StaffCoursesPage'
import { StaffHome, StaffLayout } from './StaffLayout'
import { StaffLessonEditorPage } from './StaffLessonEditor'
import { StaffReportsPage } from './StaffReportsPage'
import { StaffReviewPage } from './StaffReviewPage'
import { StaffReviewsPage } from './StaffReviewsPage'
import { StaffTranslationsPage } from './StaffTranslationsPage'

// The Learning Hub staff area under /admin, loaded on its own (App.tsx), so learners never download it.
// Each page lists the roles that may open it; the navigation (roles.ts) uses the same lists. The
// server checks the role again on every call.

export default function StaffArea() {
  return (
    <Routes>
      <Route element={<StaffLayout />}>
        <Route index element={<StaffHome />} />
        <Route path="learn/courses" element={<RequireRole roles={['admin']}><StaffCoursesPage /></RequireRole>} />
        <Route path="learn/courses/:courseId" element={<RequireRole roles={['admin']}><StaffCourseEditorPage /></RequireRole>} />
        <Route path="learn/lessons/:lessonId" element={<RequireRole roles={['admin', 'translator']}><StaffLessonEditorPage /></RequireRole>} />
        <Route path="learn/categories" element={<RequireRole roles={['admin']}><StaffCategoriesPage /></RequireRole>} />
        <Route path="reviews" element={<RequireRole roles={['admin', 'health_reviewer']}><StaffReviewsPage /></RequireRole>} />
        <Route path="reviews/:lessonId" element={<RequireRole roles={['admin', 'health_reviewer']}><StaffReviewPage /></RequireRole>} />
        <Route path="translations" element={<RequireRole roles={['admin', 'translator']}><StaffTranslationsPage /></RequireRole>} />
        <Route path="reports" element={<RequireRole roles={['admin']}><StaffReportsPage /></RequireRole>} />
        <Route path="*" element={<StaffHome />} />
      </Route>
    </Routes>
  )
}
