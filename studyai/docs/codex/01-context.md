# 01 — Context (read first)

## Project state snapshot

- **Stack:** Next.js **16.2.1** App Router (React 19, Tailwind v4, Turbopack). Dynamic route `params` is a `Promise` — `await` it. `useSearchParams` must live inside `<Suspense>`.
- **Auth gating:** `proxy.ts` at the project root (Next 16 convention). There is no `middleware.ts` and you must not create one.
- **API auth:** Bearer-token pattern. Every API route starts with `await authenticateRequest(req)` from `lib/api-auth.ts`, then a role gate (`requireTeacher`, `requireAdmin`).
- **Supabase clients:** anon in `lib/supabase.ts`, service-role in `lib/supabase/admin.ts`, SSR in `lib/supabase/server.ts`. RLS is enabled on every table.
- **Roles:** `profiles.role ∈ {'student','teacher','admin'}`.
- **Subjects model already exists:** `subjects`, `teacher_subjects`, `classes.subject_id`. `SubjectSwitcher` persists choice in `localStorage.lastTeacherSubjectId`.
- **Shell:** `components/AppShell.tsx` wraps `Sidebar` + `Navbar` + children + `Footer`. Every authed page uses it.
- **PDF diagrams:** `lib/pdf-render.ts` runs Node PDF.js with a runtime canvas backend (already working).

## Non-negotiable rules

1. **Do NOT modify the AI marking pipeline:** `components/AnswerForm.tsx`, `app/api/mark/route.ts`, `app/api/hint/route.ts`, `app/api/analyse/route.ts`, `lib/gemini.ts`, anything under `app/papers/*`. The visual rebuild restyles the *shell* (sidebar, navbar, dashboard, landing, auth, upload, papers list, search) but not these files.
2. **Do NOT edit `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`** by hand — propose CLI commands if a dependency or config change is required.
3. **Do NOT create a `middleware.ts`.** `proxy.ts` is the only gating layer.
4. **Idempotent SQL.** `create table if not exists`, `drop policy if exists` before `create policy`. Order: tables → indexes → `enable row level security` → policies.
5. **No emojis in JSX.** Icons come from `lucide-react`.
6. **Auth + RLS on every new route and table.** Service-role client only inside API routes.
7. **`pnpm run build` and `pnpm exec eslint . --max-warnings 0` must stay green** at the end of each day. Never disable type-checking.

---

## Acknowledgment checklist

- [ ] Read the project state snapshot.
- [ ] Read every non-negotiable rule.
- [ ] Will not modify any file in the locked AI marking pipeline list.
- [ ] Will use `proxy.ts` for auth gating, never create or edit `middleware.ts`.
- [ ] Will propose CLI commands rather than hand-edit JSON/config files.
- [ ] Will run `pnpm run build` and `pnpm exec eslint . --max-warnings 0` at the end of each day and keep both green.
