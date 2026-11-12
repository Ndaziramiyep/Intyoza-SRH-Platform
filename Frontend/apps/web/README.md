# Intyoza Web

The Intyoza frontend: React 19, TypeScript, Vite, React Router and Tailwind CSS v4.

Ask Intyoza is answered by the trained model through the backend (`backend/`, proxied to port 4000 in
development; set `VITE_API_URL` when the API is on another domain). The other screens still run on local
data. There are no sign-ups: the app uses an anonymous backend session, and chats and preferences stay in
the browser only if the person allows it.

## Run it

```bash
cd Frontend
npm install
npm run dev -w web      # http://localhost:5173
npm run build -w web
npm run lint -w web
```

For answers from the trained model, also run the model (`cd ai && python -m intyoza_srh`, port 8000) and the
backend (`cd backend && npm start`, port 4000, with `AI_PROVIDER=intyoza` in `backend/.env`; see
`backend/.env.example`). Without them, Ask Intyoza answers from the offline guide.

## Screens

| Route | Feature |
| --- | --- |
| `/` | Home |
| `/ask` | Ask Intyoza chat (`?topic=` or `?q=` starts a conversation) |
| `/services`, `/services/:id` | Youth Health Connect (`?need=` pre-filters) |
| `/community`, `/community/:id` | Find your community |
| `/learn` | Learning Hub: choose a course (account needed) |
| `/learn/:id` | Old lesson links: open the lesson inside its course |
| `/myths` | Myth Buster |
| `/about` | About, privacy and terms |
| `/learn/courses/:slug` | Course page (account needed) |
| `/learn/courses/:slug/check` | Before quiz, when a course starts |
| `/learn/courses/:slug/lessons/:lessonId` | Lesson player |
| `/learn/courses/:slug/complete` | Course complete: scores, certificate, next course |
| `/admin` | Learning Hub staff area (see below) |

### Learning Hub

Learners pick a category and a course, see what it covers, then take its lessons (article, audio, video,
myth or fact, quiz) with progress saved to their account. A course can start with a before quiz and end with
an after quiz; the difference is the knowledge gain in the reports.

Every screen reads through `packages/shared/src/learn/courses/client.ts`: `LearnClient` for learners and
`LearnStaffClient` for staff, one method per endpoint. Two implementations share those shapes:

| Source | Learners | Staff |
| --- | --- | --- |
| Sample data (default) | `sampleClient.ts`: the sample courses, progress per account on this device | `sampleStaffClient.ts`: edits kept on this device, the same workflow rules as the server, made-up report numbers |
| Backend (`VITE_LEARN_SOURCE=api`) | `httpClient.ts` → `/api/v1/learn/...` | `httpClient.ts` → `/api/v1/admin/...` |

On sample data the learner and staff sides are separate: publishing a lesson in `/admin` doesn't change what
learners see until both run on the backend.

#### Staff area (`/admin`)

| Page | Roles | What it does |
| --- | --- | --- |
| Courses, course editor | admin | Course details in RW / EN / FR, 3–5 "what you'll learn" points, age groups, certificate, cover; lessons in order (drag or Move up/down), add and remove |
| Lesson editor | admin, translator | RW / EN / FR tabs (a dot shows which are complete), article screens, transcripts, quiz builder (2–4 options, correct answer, explanation, before/after/both), myth-or-fact cards, media upload with size, subtitles; "See as a learner" preview; versions |
| Categories | admin | Add, edit (names in three languages, icon, colour, visible), reorder, delete only when empty |
| Health review | admin (read), health reviewer | Read a lesson in every language, approve it or ask for changes with a comment |
| Translations | admin, translator | Lessons missing RW (required) or FR; translators edit only RW and FR text, never answers or structure |
| Reports | admin | Reach, completion, knowledge gain, action taken, certificates, drop-off by lesson, by course; filters in the address; export |

Workflow: writing → health review → approved → published. A lesson can only be sent for review once RW and
EN are complete; an edit to a published lesson goes back through review while learners keep the published
version; every published version is kept and can be restored as a draft. Unsaved editor changes are kept on
the device and offered back when the editor reopens.

Settings for `.env.local`:

- `VITE_LEARN_SOURCE=api` uses the backend instead of the sample data.
- `VITE_STAFF_ROLE=admin` (or `health_reviewer`, `translator`) opens the staff screens with that role, in
  development and on sample data only.

#### For the backend

- Roles: the screens map `ADMIN`, `HEALTH_REVIEWER` and `TRANSLATOR` from `GET /auth/me` (`features/staff/roles.ts`).
- Endpoints not in the plan's list, used by the screens: `GET /learn/courses/:slug/result`,
  `GET /learn/certificates`, `GET /learn/follow-ups`, `GET /admin/translations`, `PUT /admin/categories/order`,
  `PUT /admin/courses/:id/lessons/order`, `GET /admin/lessons/:id/versions`, `POST /admin/lessons/:id/versions/:n/restore`.
- Responses are read as `{ <name>: data }`, like the existing endpoints. Errors with `error.code` set to one of
  `MISSING_LANGUAGES`, `NOT_IN_REVIEW`, `NOT_APPROVED`, `COMMENT_REQUIRED`, `CATEGORY_HAS_COURSES` get a clear message.
- The sample export is a CSV that Excel opens; `/admin/reports/export` can return a real `.xlsx` instead.

Light and dark mode follow the device until the person picks one in the header. The language
defaults to Kinyarwanda (RW / EN / FR switch in the header).

## Shared package

Logic that does not depend on the browser lives in `Frontend/packages/shared` (`@intyoza/shared`):
translations, the chat guide and safety rules, myths, lessons, services and community data.
Browser-specific pieces (storage, privacy consent, the stores) stay in `src/lib`.

## Where the API plugs in

Each feature reads its data through one function or store. To connect an API, replace that function's body and keep its return shape. The screens don't need to change.

| Feature | File | Today |
| --- | --- | --- |
| Ask Intyoza | `packages/shared/src/chat/client.ts` → `askIntyoza()` | Backend + trained model (`api/client.ts`); local guide in `chat/guide.ts` when offline |
| Health Connect | `packages/shared/src/services/api.ts` → `fetchFacilities()`, `fetchFacility()` | `services/sampleData.ts` (sample listings) |
| Community | `packages/shared/src/community/store.ts` | Saved in the browser; seed posts in `data.ts` |
| Learning Hub | `packages/shared/src/learn/content.ts` | Static lessons |
| Myth Buster | `packages/shared/src/myths/data.ts` | Static list; RW and FR text in `myths/translations.ts` |

When the model answers, the chat shows only what it returns (answer, source, disclaimer, suggestions, the numbers it
gives); the model runs its own safety rules. The safety rules in `packages/shared/src/chat/safety.ts` run when the
backend can't be reached, so emergency contacts still show without the network.

## Languages

UI text lives in `packages/shared/src/i18n/translations.ts` (RW, EN, FR). Missing strings fall back to English. The Kinyarwanda and French text needs review by native speakers.
