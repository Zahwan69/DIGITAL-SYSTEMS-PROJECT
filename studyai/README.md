# StudyAI

An AI-powered past-paper study assistant for Cambridge-style exams.
Students upload PDFs, Gemini extracts questions, and the app marks
written answers with feedback, XP, and streaks. Teachers can run
classes, set assignments, and invite students.

Built with **Next.js 16 (App Router)**, **Supabase**, and **Google
Gemini**.

## Features

### Student

- Upload past-paper PDFs — Gemini extracts each question, topic, marks,
  and difficulty.
- Answer questions and get AI-marked feedback with strengths,
  improvements, and a model answer.
- Earn XP, levels, and study streaks. Bonuses for full marks, completing
  a full paper, and streak milestones.
- Socratic hints mid-question (without giving the answer away).
- Browse your own papers or search shared papers by syllabus code.
- Join a class via a 6-character code, see assignments from teachers,
  and respond to invites.

### Teacher

- Create classes (each with a unique join code).
- Set assignments tied to a past paper, with optional instructions and
  due date.
- Search students and invite them directly — they accept or decline
  from their dashboard.
- View class members and pending invites in one place.
- Dashboard overview (12-week activity) and **Analytics** at
  `/teacher/insights` (class comparison, topics, engagement, and more).

### Superadmin

- Users with `profiles.role = 'admin'` get an **Admin console** in the
  sidebar (`/admin/*`): users, papers, subjects, metrics, audit log.
  Apply `supabase/schema-admin.sql` after the teacher schema.

## Stack

| Layer        | Tech                                                   |
| ------------ | ------------------------------------------------------ |
| Framework    | Next.js 16.2 (App Router, Turbopack, RSC)              |
| UI           | React 19, Tailwind v4, Radix UI primitives             |
| Auth & DB    | Supabase (Postgres, Auth, RLS)                         |
| AI           | Google Gemini (`@google/generative-ai`)                |
| PDF parsing  | `pdf-parse` + Gemini inline PDF input                  |
| Runtime      | Node (via Next.js route handlers)                      |
| Package mgr  | pnpm                                                   |

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io/installation).

```bash
pnpm install
pnpm dev
```

Then open <http://localhost:3000>.

### Environment variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
```

### Database setup

Apply the SQL files under `supabase/` in the Supabase SQL editor in
order:

1. Your existing core schema (profiles, past_papers, questions,
   attempts) — already present in your project.
2. `supabase/schema-teacher.sql` — adds `profiles.role`, `classes`
   (including **`subject_id`** via §2b), `subjects`, `teacher_subjects`,
   `class_members`, `assignments`, `class_invites`, and RLS policies.
3. **`supabase/PATCH_classes_subject_id.sql`** (or `schema-teacher-subjects.sql`)
   — **only if** `classes.subject_id` is missing (error from the app). Run the
   whole file in the SQL editor for the **same** project as `.env.local`. See
   the `SELECT` at the bottom of the patch file to confirm the column exists.
4. `supabase/schema-admin.sql` — extends `role` check with `admin`,
   `admin_audit_log`, and admin-only RLS for the audit table.

To make a user a teacher, run in the SQL editor:

```sql
update public.profiles set role = 'teacher' where id = '<user-uuid>';
```

They will see **Teacher** in the app sidebar on the next page load.

## Project layout

```
app/
  api/
    analyse/           Upload a PDF → Gemini extracts questions
    mark/              Mark a student's answer (Gemini + XP + streak)
    hint/              Socratic hint for a question (no giveaways)
    teacher/
      classes/         GET/POST teacher's classes
      classes/[classId]/
        members/       GET members of a class
        assignments/   GET/POST assignments
        invites/       GET/POST invites
      search-students/ GET students by username/full_name
      overview/        GET dashboard KPIs + 12-week series (Bearer)
      analytics/       GET teacher analytics datasets (Bearer)
      assignments-list/ GET assignments for listings
      subjects/        GET/POST teacher subject links
    admin/
      users/           GET list; users/[userId]/role POST
      metrics/         GET aggregate counts
      papers/          GET list; papers/[paperId] DELETE
      subjects/        GET/POST; subjects/[subjectId] DELETE
      audit/           GET admin_audit_log
    student/
      join-class/      POST — join via 6-char code
      assignments/     GET — assignments across joined classes
      invites/         GET — pending invites
      invites/[inviteId]/respond/
                       POST { action: "accept" | "decline" }
  auth/                Login, signup pages
  dashboard/           Student dashboard (stats, invites, join, assignments)
  papers/              Paper list, paper detail, search
  admin/               Admin console (role-gated UI + Bearer APIs)
  teacher/
    dashboard/         Teacher overview (KPIs + chart + classes)
    classes/[id]/      Class detail (members, assignments, invites)
    insights/          Teacher analytics (Recharts)
  upload/              PDF upload page
components/
  AppShell.tsx         Sidebar + Navbar + Footer layout
  Sidebar.tsx / Navbar.tsx / Footer.tsx
  AnswerForm.tsx       Answer → /api/mark → result UI
  EmptyState.tsx       Shared empty pattern
  ui/                  Radix-based primitives (Button, Card, Skeleton, …)
lib/
  api-auth.ts          Bearer-token auth helper for route handlers
  gemini.ts            Gemini client + model fallback
  supabase.ts          Browser Supabase client
  supabase/server.ts   Server-side cookie client
  supabase/admin.ts    Service-role client (server-only)
  utils.ts             cn(), XP helpers, generateJoinCode()
proxy.ts               Next 16 route gate (cookie session) for protected routes
supabase/
  schema-teacher.sql   Classroom DDL + RLS
  schema-admin.sql     Admin role + audit log DDL + RLS
types/
  database.ts          Shared DB row types
```

## Architecture notes

- **Auth pattern.** Route handlers accept a Supabase session token as a
  `Authorization: Bearer <token>` header. See `lib/api-auth.ts`. The
  browser fetches `session.access_token` from `supabase.auth.getSession()`
  before every API call.
- **Admin client.** Mutations that need to bypass RLS (e.g., writing to
  `class_members` from another user's perspective during an invite
  accept) use `supabaseAdmin` from `lib/supabase/admin.ts`. This file
  is `server-only`.
- **RLS.** Every classroom table has row-level security. Teachers can
  read/write their own classes; students can read classes they are
  members of and accept their own invites. Policies live in
  `supabase/schema-teacher.sql`.
- **Next.js 16 specifics.** `params` in route handlers and pages is a
  `Promise<...>` — always `await params` before using it. `cookies()`
  is async. The project uses Turbopack builds.

## Scripts

```bash
pnpm dev       # start dev server
pnpm build     # production build (verifies types)
pnpm start     # start prod server (requires build)
pnpm lint      # ESLint
```

## Known follow-ups

- Student view of their submitted assignments currently reuses the
  generic `/papers/[id]` page. A per-assignment attempt view
  (score, teacher's comment) could be added later.
