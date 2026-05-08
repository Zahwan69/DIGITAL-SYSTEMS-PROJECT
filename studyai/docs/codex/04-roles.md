# 04 — Role permissions and dashboard scope

Three roles, three different surfaces. Use this as the single source of truth for sidebar items, dashboard contents, and server-side role checks.

## 1. Role definitions

- **Student** — primary user. Studies past papers and sees only their own progress.
- **Teacher** — classroom owner. Has access to **every student feature in addition to** classroom management. Cannot manage roles, permissions, users, or global subjects.
- **Admin** — school office staff (not a teacher). Manages users, roles, and global config. Does **not** study, does **not** own classes, does **not** mark.

## 2. Capability matrix

| Capability | Student | Teacher | Admin |
|---|---|---|---|
| Personal study dashboard (XP, level, streak) | ✓ | ✓ | — |
| Upload paper, search syllabus, view own papers | ✓ | ✓ | — |
| Practice questions + AI grading + AI hints | ✓ | ✓ | — |
| Receive / accept class invites, join class | ✓ | — | — |
| View own attempts and assignments | ✓ | ✓ | — |
| Create / edit / delete own classes | — | ✓ | — |
| Invite students to a class | — | ✓ | — |
| Create assignments + due dates | — | ✓ | — |
| View class analytics | — | ✓ (own classes) | ✓ (read-only, all) |
| AI chat about a class | — | ✓ (own classes) | — |
| Promote / demote user roles | — | — | ✓ |
| Manage users (list, search, suspend) | — | — | ✓ |
| Manage subjects globally (CRUD) | — | — | ✓ |
| Delete any paper | own only | own only | ✓ (any) |
| View admin audit log | — | — | ✓ |
| School-wide KPIs | — | — | ✓ |

## 3. Dashboard contents per role

**Student `/dashboard`** — XP/level/streak block, active assignments (top 3), pending class invites, quick actions (Upload, My Papers, Search), recent attempts (last 5).

**Teacher `/teacher/dashboard`** — AI chat hero card (per `03-feature-teacher-chat.md` §1) pinned at the top, then subject switcher, class overview tiles (students, attempts last 7d, avg %), recent assignments with completion progress, quick links to Classes / Assignments / Insights.

**Admin `/admin/dashboard`** — four KPI cards (total users, teachers, classes, papers), 30-day combo chart (signups / attempts / papers), top-teachers-by-enrollment table, quick links to Users / Papers / Subjects / Audit log.

## 4. Nav items per role

- **Student topbar (desktop) / drawer (mobile):** Dashboard, My Papers, Upload, Search.
- **Teacher topbar (desktop) / drawer (mobile):** every student item, divider, then Teacher Dashboard, Classes, Assignments, Insights, **AI Chat** (new, links to `/teacher/chat`).
- **Admin sidebar (desktop) / drawer (mobile):** Admin Dashboard, Users, Papers, Subjects, Audit log. Admin does **not** see student or teacher items.

## 5. Server gating rules

- Every `/api/admin/*` route uses `requireAdmin`. Reject teachers and students with 403 and no body.
- Every `/api/teacher/*` route uses `requireTeacher`. Reject students **and** admins with 403 — admins are not class owners.
- Student-side endpoints use `authenticateRequest` only; data is RLS-scoped to the user.
- A teacher hitting `POST /api/admin/users/[id]/role` returns 403. An admin hitting `POST /api/teacher/classes` returns 403. Both must have a test.

## 6. UI guard rules

- Nav rendering is driven by `role` from `profiles`, fetched once in `AppShell`. Do not hand-roll role checks inside individual pages — use a central nav config.
- `proxy.ts` redirects a student hitting `/teacher/*` or `/admin/*` to `/dashboard`, and a teacher hitting `/admin/*` to `/teacher/dashboard`.
- Admin-only buttons never render for non-admins. The API rejects them too — defense in depth.

---

## Roles checklist

### Server gating audit
- [ ] Every file in `app/api/admin/` calls `requireAdmin` first.
- [ ] Every file in `app/api/teacher/` calls `requireTeacher` first.
- [ ] `requireTeacher` rejects admins (not just students).
- [ ] Test: student → `GET /api/teacher/overview` returns 403.
- [ ] Test: teacher → `POST /api/admin/users/[id]/role` returns 403.
- [ ] Test: admin → `POST /api/teacher/classes` returns 403.
- [ ] 403 responses have empty bodies (no leaking which routes exist).

### proxy.ts redirects
- [ ] Student hitting `/teacher/*` or `/admin/*` → `/dashboard`.
- [ ] Teacher hitting `/admin/*` → `/teacher/dashboard`.
- [ ] Admin hitting `/teacher/*` → `/admin/dashboard`.

### UI / nav config
- [ ] Central nav config exposed from a single module (e.g. `lib/nav-config.ts`) keyed by role.
- [ ] `AppShell` reads `profiles.role` once and feeds the nav config; no per-page role checks.
- [ ] Student dashboard contents match §3.
- [ ] Teacher dashboard contents match §3 (chat hero card on top).
- [ ] Admin dashboard contents match §3.
- [ ] Admin-only buttons (e.g. "Promote to admin") render only for admins.

### Verification
- [ ] `pnpm run build` green.
- [ ] `pnpm exec eslint . --max-warnings 0` green.
