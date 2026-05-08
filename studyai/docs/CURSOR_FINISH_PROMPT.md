# Cursor finishing prompt — StudyAI

Paste everything below the `---` line into Cursor (Composer / Agent mode).
It is self-contained: a state snapshot, non-negotiable rules, and three work
tracks with acceptance criteria.

---

## Project state snapshot (read before acting)

- **Framework:** Next.js **16.2.1** App Router, React 19, Tailwind v4,
  Turbopack. `params` is a `Promise` and must be `await`ed in route handlers
  / dynamic pages. Do **not** use any pre-13 patterns.
- **Auth / DB:** Supabase (`@supabase/ssr` in **`proxy.ts`**, anon client in
  `lib/supabase.ts`, service-role in `lib/supabase/admin.ts`). Bearer-token
  pattern for API routes via `lib/api-auth.ts` — `authenticateRequest(req)`
  returns `{ ok, userId, token } | { ok: false, status, message }`.
- **Roles:** `profiles.role` is `'student' | 'teacher' | 'admin'` once
  `schema-admin.sql` is applied. Role is read client-side by `AppShell` /
  `Sidebar` and gated on the server via `requireTeacher()` /
  `requireAdmin()`.
- **Design tokens** (already in `app/globals.css`, do not rename):
  `bg`, `surface`, `surface-alt`, `text`, `text-muted`, `text-on-accent`,
  `border`, `border-strong`, `accent` (garnet `#7B1E23`), `accent-hover`,
  `accent-soft` (champagne pink `#FCE4E4`), `success`, `warning`, `danger`.
  Fonts: `font-serif` = Fraunces (headings), `font-sans` = Inter (body).
- **Shell:** `components/AppShell.tsx` wraps `Sidebar` + `Navbar` + children
  + `Footer`. Every authed page uses it. Sidebar already branches on
  `role === 'teacher'` and on `pathname.startsWith('/teacher')`.
- **Subject model (already migrated):** `subjects` (id, name, syllabus_code,
  level), `teacher_subjects` (teacher_id, subject_id), `classes.subject_id`
  FK. Teacher pages filter via `?subject=<id>`; `SubjectSwitcher` persists
  the last choice in `localStorage.lastTeacherSubjectId`.
- **Existing teacher pages:** `/teacher/dashboard` (overview with recharts
  12-week line chart), `/teacher/classes`, `/teacher/classes/[id]`,
  `/teacher/assignments`, `/teacher/insights` (**analytics** — charts fed by
  `/api/teacher/analytics`).
- **Build:** `pnpm run build` green; session gating lives in **`proxy.ts`**
  (Next 16). **`components/Navbar.tsx`** has been **deleted** (was orphan).

## Non-negotiable rules

1. **Do not change the AI marking pipeline** — `components/AnswerForm.tsx`,
   `app/api/mark/route.ts`, `app/api/hint/route.ts`, `app/api/analyse/route.ts`,
   `lib/gemini.ts`, and anything under `app/papers/*` is out of scope except
   where Track B explicitly adds a *new* read-only query on top.
2. **Use the existing tokens.** No raw hex in JSX. No new color variables.
   Icons come from `lucide-react` — never emojis.
3. **Auth on every new API route.** `authenticateRequest` first, then a
   role gate (`requireTeacher` / new `requireAdmin`), then the query.
4. **RLS on every new table.** Enable RLS; write explicit policies. Admin
   access goes through the service-role client in API routes — not RLS
   policies that open tables to a role claim, unless the user already has
   `role='admin'` in `profiles`.
5. **Idempotent SQL.** `create table if not exists`, `drop policy if exists`
   before `create policy`. Order: (1) columns / tables, (2) indexes, (3)
   `alter … enable row level security`, (4) policies last so cross-table
   `exists (...)` references resolve.
6. **Next 16 rules.** `await params` in every `[id]` route. `useSearchParams`
   must be inside a `<Suspense>` boundary (mirror `SubjectSwitcher` →
   `TeacherNav` pattern in `components/Sidebar.tsx`). Keep middleware as-is
   in this pass; the rename is a separate follow-up.
7. **Verification.** After every track, run `pnpm run build`; the build
   must stay green. Never disable type-checking.

---

## Track A — Superadmin dashboard

### Why
There is currently no way to promote users, audit usage, or moderate content
without running raw SQL. Add a gated `/admin` area behind a new `admin`
role.

### A.1 — Schema (`supabase/schema-admin.sql`, new file)

```sql
-- 1. role enum extension (profiles.role already exists as free text)
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','teacher','admin'));

-- 2. admin audit log
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,                    -- e.g. 'promote_teacher'
  target_type text not null,               -- 'user' | 'paper' | 'subject'
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_actor_idx on public.admin_audit_log(actor_id);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_select on public.admin_audit_log;
create policy admin_audit_select on public.admin_audit_log
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );
-- Inserts happen from service-role API routes, so no insert policy needed.
```

Append a `-- Promote a user to admin:` comment with
`update public.profiles set role='admin' where id='<uuid>';`.

### A.2 — Server helpers (`lib/api-auth.ts`, extend)

Add `requireAdmin(userId: string): Promise<boolean>` mirroring
`requireTeacher`, using `supabaseAdmin`. Keep it next to the existing helper.

Also add a small audit helper in `lib/admin-audit.ts`:

```ts
export async function logAdminAction(
  actorId: string,
  action: string,
  targetType: "user" | "paper" | "subject",
  targetId: string | null,
  metadata: Record<string, unknown> = {}
) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId, action, target_type: targetType,
    target_id: targetId, metadata,
  });
}
```

### A.3 — API routes

All under `app/api/admin/`, all Bearer-token + `requireAdmin`:

- `GET users/route.ts` — paginated list. Query params `q`, `role`, `page`
  (default 1), `pageSize` (default 25). Joins `profiles` + `auth.users`
  via `supabaseAdmin.auth.admin.listUsers` — return `[{ id, email,
  username, full_name, role, xp, level, last_study_date, created_at }]`.
- `POST users/[userId]/role/route.ts` — body `{ role: 'student' | 'teacher'
  | 'admin' }`. Reject if `userId === auth.userId` (no self-demotion).
  Update `profiles.role`, call `logAdminAction`.
- `GET metrics/route.ts` — returns `{ totals, series, usage }`:
  - `totals`: users, teachers, admins, classes, papers, attempts (count
    queries).
  - `series`: last 30 days of daily `{ day, signups, attempts, papers }`.
    Compute with `date_trunc('day', created_at)` GROUP BY; do three small
    queries, then merge by day on the server.
  - `usage`: sum of `attempts.xp_earned` last 30 days as a rough proxy
    for AI-call cost (do **not** try to meter Gemini — out of scope).
- `GET papers/route.ts` — paginated papers across all teachers, with
  `uploaded_by` joined to `profiles.username` / `full_name`.
- `DELETE papers/[paperId]/route.ts` — cascade delete (questions + attempts
  should follow existing FK rules). Log action.
- `GET subjects/route.ts` + `POST subjects/route.ts` + `DELETE
  subjects/[subjectId]/route.ts` — CRUD on `public.subjects`. Keep names
  unique on (`name`,`syllabus_code`). Log every mutation.
- `GET audit/route.ts` — last 100 rows of `admin_audit_log`, joined to
  actor profile for a display name.

### A.4 — UI

Add an **Admin** block at the top of `Sidebar.tsx`'s nav switch:

```tsx
const showAdminBlock = role === "admin" && pathname.startsWith("/admin");
```

Render an `AdminNav` (new) with items: Overview, Users, Papers, Subjects,
Audit log. Icons: `ShieldCheck`, `Users`, `FileText`, `BookOpen`, `History`.
When `role === 'admin'` but not in the admin area, show a small "Admin
console" link (mirrors the existing `role === 'teacher' && !teacherArea`
link).

Pages (all wrapped in `AppShell`, all use design tokens, no raw hex):

- `app/admin/dashboard/page.tsx` — 4 KPI cards (total users / teachers /
  classes / papers) + a 30-day combo chart (recharts `LineChart` with three
  series: signups, attempts, papers) + "Top teachers by student count" table.
- `app/admin/users/page.tsx` — search input (debounced 300ms), role filter
  dropdown, paginated table. Row actions: "Promote to teacher", "Promote to
  admin", "Demote to student". Confirm with a simple `<Dialog>` before
  role changes.
- `app/admin/papers/page.tsx` — paginated table with uploader name, year,
  syllabus, question count, `created_at`. Row action: Delete (confirm).
- `app/admin/subjects/page.tsx` — list + inline create form (name,
  syllabus_code, level) + delete button. Deletion blocked if any class
  references it — handle the FK error and show a toast, do **not** cascade
  silently.
- `app/admin/audit/page.tsx` — simple reverse-chronological table: when,
  who, action, target.

### A.5 — Route protection

Ensure `/admin` is in the `protectedPrefixes` array in **`proxy.ts`**
(Next.js 16). Older docs referred to `middleware.ts`; the project uses
`export async function proxy` in `proxy.ts` only.

### A.6 — Acceptance

- `pnpm run build` green.
- Log in as a non-admin teacher → `/admin/*` redirects to login (`proxy.ts`)
  *or* the API returns 403 (defense in depth).
- Log in as admin → Sidebar shows the Admin block, every admin page renders
  without an un-suspended `useSearchParams` warning.
- Promoting a user appears in `admin_audit_log`.

---

## Track B — Teacher analytics section

### Why
`/teacher/insights` should surface aggregate analytics. These are the
features the user asked us to recommend; implement *all* of them because the
data is already in the database. *(Repo status: implemented — verify against
the acceptance list below.)*

### B.1 — API route `app/api/teacher/analytics/route.ts`

Bearer-auth + `requireTeacher`. Reads `?subject=<id>` and `?classId=<id>`
(optional, both filter by teacher's own classes). Returns:

```ts
{
  perStudentTrajectory: [{ studentId, studentLabel, points: [{ date, percentage }] }],
  topicMastery:          [{ topic, avgPercentage, attempts, classId }],
  difficultyMix:         [{ difficulty: 'easy'|'medium'|'hard', count, avgPercentage }],
  assignmentFunnel:      [{ assignmentId, title, assigned, attempted, completed }],
  engagement:            [{ day, activeStudents, attempts }],   // last 28 days
  timeOfDay:             [{ hour: 0..23, attempts }],
  classComparison:       [{ classId, className, avgPercentage, attempts, students }],
  cohortXp:              [{ classId, className, xpLast30: number, xpPerStudent: number }],
}
```

Implementation notes:
- Scope: start from `classes where teacher_id = auth.userId` (+ subject
  filter). Walk → `class_members` → student ids → `attempts` (by
  `question_id` joined through `questions.paper_id` → assignments). Mirror
  the join pattern already used in `app/api/teacher/overview/route.ts`.
- `topicMastery`: group attempts by `questions.topic` (null topics get
  bucketed as "Uncategorized"), avg(percentage), count(*).
- `assignmentFunnel`: `assigned = class_members in the assignment's class`,
  `attempted = distinct users with ≥1 attempt on any question in that
  paper`, `completed = users whose attempt count ≥ question count on that
  paper`.
- `engagement`: bucket last 28 days by `date_trunc('day', created_at)`.
- `timeOfDay`: `extract(hour from created_at)` grouped 0..23.
- Cap every list at 500 rows server-side; this is analytics, not a feed.

### B.2 — Page `app/teacher/insights/page.tsx` (replace the placeholder)

Wrap in `<Suspense>` + `AppShell` (mirror `/teacher/assignments/page.tsx`).
Sections, top to bottom, each in a `Card`:

1. **Class comparison** — horizontal bar chart of avg % per class (recharts
   `BarChart`, single series, `fill="var(--color-accent)"`).
2. **Topic mastery heatmap** — grid of `topic × class` cells colored on a
   ramp `accent-soft → accent` using `hsl` interpolation (or a simple 5-step
   ramp via opacity). Tooltip shows count + avg %.
3. **Per-student trajectory** — recharts `LineChart`, x=date, y=%, one
   line per student (cap to 20 students — show a "+N more" hint if clipped).
4. **Difficulty mix** — stacked bar of easy / medium / hard, attempt count
   on one axis, avg % as a tooltip.
5. **Assignment completion funnel** — table: title, assigned, attempted,
   completed, %complete bar.
6. **Engagement (28d)** — dual-series line: activeStudents + attempts.
7. **Time-of-day** — small 24-column bar chart (0..23).
8. **Cohort XP** — table: class, XP last 30d, XP / student.

Empty states: "No attempts in this scope yet." Never throw on empty data.

### B.3 — Sidebar label

In `Sidebar.tsx`, rename the `Insights` nav item's label to **Analytics**
(keep the path `/teacher/insights` to avoid breaking links). Icon stays
`Lightbulb`.

### B.4 — Acceptance

- Page renders under the subject filter and responds to it (charts re-fetch
  when `?subject=` changes).
- `pnpm run build` green, no hydration warnings.
- Switching to a subject with zero attempts shows the empty state without
  a client error.

---

## Track C — UI/UX polish + housekeeping

Small pile of finishing items. Do these in a single commit.

1. **Delete `components/Navbar.tsx`.** *(Done in repo.)* Keep
   `README.md` / `NEXT_STEPS.md` / `docs/UI_UX.md` free of stale Navbar
   references.
2. **Skeletons.** Add `components/ui/Skeleton.tsx` (a single div with
   `animate-pulse bg-surface-alt rounded-md`). Use it on `/teacher/dashboard`
   and `/teacher/insights` while the initial fetch is in flight instead of
   the text "Loading…".
3. **Empty states.** `components/EmptyState.tsx` — icon slot + title +
   description + optional action. Use on `/teacher/classes` (when the
   teacher has no classes yet), `/teacher/assignments`, `/dashboard`
   (student with no assignments).
4. **`prefers-reduced-motion`.** Add a global rule in `app/globals.css`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after { animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
   }
   ```
5. **Middleware rename.** Use **`proxy.ts`** only (Next 16 convention).
   *(Done in repo.)* There must be no root `middleware.ts` if you want a
   clean build without the deprecation warning.
6. **Navbar breadcrumb for `/admin`.** Extend `segmentTitle` in
   `components/Navbar.tsx`: `admin: "Admin"`, `users: "Users"`,
   `audit: "Audit log"`, `subjects: "Subjects"`.
7. **Footer help links.** Replace the `https://github.com` placeholder
   with `https://github.com/<owner>/<repo>/issues` — ask the user for the
   repo URL before replacing; if they don't know, leave the placeholder and
   note it in a comment-free TODO line in `NEXT_STEPS.md`.

### Acceptance

- `pnpm run build` green, **no** deprecation warnings.
- Keyboard-only: tabbing from the top of any page hits the "Skip to
  content" link first, then sidebar, then main.
- Reduced-motion system setting removes animations on the sidebar and
  charts.

---

## Deliverables (in this exact order)

1. Run `pnpm run build` to confirm current-state baseline.
2. Track A schema + API + UI + middleware.
3. Track B API + page.
4. Track C polish.
5. Final `pnpm run build` + brief summary of what changed per track.
6. Update `NEXT_STEPS.md` with: SQL files that need to be applied, admin
   promotion SQL snippet, and any remaining follow-ups.

Do **not** commit. Leave the diff clean for the user to review.
