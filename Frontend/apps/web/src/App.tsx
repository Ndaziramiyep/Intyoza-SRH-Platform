import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AccountProvider } from './features/account/AccountProvider'
import { DashboardPage } from './features/account/DashboardPage'
import { AuthSuccessPage } from './features/account/AuthSuccessPage'
import { AuthPage } from './features/account/AuthPage'
import { RequireAccount } from './features/account/RequireAccount'
import { LanguageProvider } from './i18n/LanguageProvider'
import { AskRoute } from './features/ask/ChatWidgetProvider'
import { FacilityDetailPage } from './features/services/FacilityDetailPage'
import { ServicesPage } from './features/services/ServicesPage'
import { CommunityGroupPage } from './features/community/CommunityGroupPage'
import { CommunityPage } from './features/community/CommunityPage'
import { BeforeQuizPage } from './features/learn/courses/BeforeQuizPage'
import { CourseCompletePage } from './features/learn/courses/CourseCompletePage'
import { CoursePage } from './features/learn/courses/CoursePage'
import { LearningHubPage } from './features/learn/courses/LearningHubPage'
import { LegacyLessonRoute } from './features/learn/courses/LegacyLessonRoute'
import { LessonPlayerPage } from './features/learn/courses/LessonPlayerPage'
import { MythsPage } from './features/myths/MythsPage'
import { AboutPage } from './pages/AboutPage'
import { HomePage } from './pages/HomePage'
import { PrivacyProvider } from './privacy/PrivacyProvider'
import { ThemeProvider } from './theme/ThemeProvider'

const StaffArea = lazy(() => import('./features/staff/StaffArea'))

// Visitors use the app as guests; logging in (one button in the header) adds the dashboard,
// community groups and the other account features (AccountProvider).
function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <BrowserRouter>
          <PrivacyProvider>
            <AccountProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="ask" element={<AskRoute />} />
                  <Route path="services" element={<ServicesPage />} />
                  <Route path="services/:id" element={<FacilityDetailPage />} />
                  {/* Everyone sees the groups; opening one needs an account. */}
                  <Route path="community" element={<CommunityPage />} />
                  <Route
                    path="community/:id"
                    element={
                      <RequireAccount title="gate.communityTitle" text="gate.communityText">
                        <CommunityGroupPage />
                      </RequireAccount>
                    }
                  />
                  <Route
                    path="learn"
                    element={
                      <RequireAccount title="gate.learnTitle" text="gate.learnText">
                        <LearningHubPage />
                      </RequireAccount>
                    }
                  />
                  {/* Old lesson links open the lesson inside its course. */}
                  <Route path="learn/:id" element={<LegacyLessonRoute />} />
                  {/* Learning Hub courses: progress is saved to the account, so they need one. */}
                  {(
                    [
                      ['learn/courses/:slug', <CoursePage />],
                      ['learn/courses/:slug/check', <BeforeQuizPage />],
                      ['learn/courses/:slug/lessons/:lessonId', <LessonPlayerPage />],
                      ['learn/courses/:slug/complete', <CourseCompletePage />],
                    ] as const
                  ).map(([path, page]) => (
                    <Route
                      key={path}
                      path={path}
                      element={
                        <RequireAccount title="gate.learnTitle" text="gate.learnText">
                          {page}
                        </RequireAccount>
                      }
                    />
                  ))}
                  <Route path="myths" element={<MythsPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="auth/success" element={<AuthSuccessPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="account" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<HomePage />} />
                </Route>
                {/* Full-screen pages, without the site header and footer. */}
                <Route path="login" element={<AuthPage mode="login" />} />
                <Route path="register" element={<AuthPage mode="register" />} />
                {/* Learning Hub staff (admins, health reviewers, translators): its own download. */}
                <Route
                  path="admin/*"
                  element={
                    <Suspense fallback={null}>
                      <StaffArea />
                    </Suspense>
                  }
                />
              </Routes>
            </AccountProvider>
          </PrivacyProvider>
        </BrowserRouter>
      </ThemeProvider>
    </LanguageProvider>
  )
}

export default App
