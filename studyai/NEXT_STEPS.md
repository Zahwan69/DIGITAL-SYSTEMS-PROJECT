# NEXT STEPS (Resume Guide)

## Current status

`pnpm run build` and ESLint (`pnpm exec eslint . --max-warnings 0`) are
green. Route protection uses **`proxy.ts`** (Next.js 16 convention), not
`middleware.ts`. The old **`components/Navbar.tsx`** file has been removed;
navigation lives in **`AppShell`**, **`Sidebar`**, and **`Navbar`**.

### Implemented (recent)

- **Teacher:** overview API, analytics API (`/api/teacher/analytics`),
  `/teacher/insights` charts, subject filtering, skeletons on dashboard.
- **Admin:** `supabase/schema-admin.sql`, `requireAdmin`, admin API routes
  under `app/api/admin/*`, pages under `app/admin/*`, sidebar admin block,
  audit logging helper.
- **Polish:** shared `EmptyState`, `prefers-reduced-motion` in globals,
  orphan Navbar removed.

### SQL to apply (Supabase), in order

1. `supabase/schema-teacher.sql` — if not already applied (includes
   **`classes.subject_id`** and `subjects` / `teacher_subjects`).
2. If the app says **`column classes.subject_id does not exist`**, open
   **the same Supabase project** as in `.env.local` → **SQL Editor** → paste
   and run the **entire** file  
   **`supabase/PATCH_classes_subject_id.sql`**  
   (same DDL as `schema-teacher-subjects.sql`, plus `notify pgrst` and a verify
   `select` at the bottom). The last query must return one row for `subject_id`.
   If it returns **zero rows**, you ran SQL on the wrong project or `public.classes`
   is missing — fix env URL or run `schema-teacher.sql` first.
3. `supabase/schema-admin.sql` — `admin` role + `admin_audit_log`.

### Role promotion (SQL editor)

Teacher:

```sql
update public.profiles set role = 'teacher' where id = '<user-uuid>';
```

Superadmin:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

Log out and back in so the JWT / session reflects the new role.

### Smoke test

1. Teacher: `/teacher/dashboard`, `/teacher/insights`, create a class,
   join as a student, confirm assignments.
2. Admin: `/admin/dashboard` (non-admin should be redirected by `proxy.ts`);
   admin APIs should return **403** without the admin role.

## Known follow-ups (not blocking)

- **Per-assignment student view.** Assignments still deep-link to
  `/papers/[id]`. A dedicated attempt view (due date, comment, score) is
  optional.
- **Invite badge.** Students only see invites on the dashboard; a nav
  badge would be a small UX win.
- **Footer help URL.** If you want a real GitHub issues link, set it in
  `components/Footer.tsx` and drop a one-line note here with the repo URL.

## Do NOT modify (project constraint)

- `components/AnswerForm.tsx`
- `app/api/mark/route.ts`
- `app/api/hint/route.ts`
- `app/api/analyse/route.ts`
- `lib/gemini.ts`
- `app/papers/*` (except incidental shell/layout if already wired)

## Resume commands

```powershell
cd "c:\DIGITAL SYSTEMS PROJECT\DIGITAL-SYSTEMS-PROJECT\studyai"
pnpm install
pnpm run build
pnpm exec eslint . --max-warnings 0
```

The finishing spec and acceptance criteria live in
`docs/CURSOR_FINISH_PROMPT.md` (tracks A–C); treat it as the checklist for
any remaining gaps.

## Image Support Ship Note (Option B)

- Added DB schema files: `supabase/schema-images.sql` and `supabase/schema-images-storage.sql` for question diagram metadata and student answer image paths.
- Apply SQL in order: `schema-images.sql` -> create `question-images` (public) + `answer-images` (private) buckets -> `schema-images-storage.sql`.
- `app/api/analyse/route.ts` now authenticates via `authenticateRequest`, requests `hasDiagram` + `diagramPage` from Gemini, renders diagram pages to PNG, and uploads page images without failing the whole analysis flow on render/upload errors.
- `lib/pdf-render.ts` uses Node PDF.js rendering with runtime canvas backend resolution; if native `canvas` is unavailable, install/allow a compatible backend and re-run build.
- `app/papers/[id]/page.tsx` now shows question diagrams inline and silently falls back to a "Diagram unavailable" notice when image loading fails.
- `components/AnswerForm.tsx` supports optional photo upload (8 MB cap, preview, remove) and allows text-only, image-only, or combined submissions while leaving the hint flow intact.
- `app/api/mark/route.ts` validates image ownership and mime/size limits, marks with optional multimodal image input, stores answer image path, and returns a signed image URL for review UI.
- Slow Gemini responses now surface as a clean 502-style user error from `/api/mark`; no silent fallback to text-only marking is performed.
