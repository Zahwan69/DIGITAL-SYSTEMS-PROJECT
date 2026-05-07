# StudyAI — 2-Day Finish (Codex brief)

This folder is the complete spec for a 2-day push to finish StudyAI for **local demonstration only** — no deployment.

## Files (read in order)

1. **`01-context.md`** — project state snapshot + non-negotiable rules. **Read first.**
2. **`02-frontend.md`** — visual rebuild: tokens, typography, landing page, Aceternity integration, footer/navbar/sidebar rework, AI image slots.
3. **`03-feature-teacher-chat.md`** — the single new feature: AI chat for teachers about their classes.
4. **`04-roles.md`** — role permissions matrix, dashboard contents per role, server gating rules.

## Two-day plan

### Day 1 — visual rebuild + chat backend

1. Confirm `pnpm run build` is green before any changes (`01-context.md`).
2. Replace tokens and install Aceternity (`02-frontend.md` §1, §10).
3. Rewrite `app/page.tsx` landing with image slots (`02-frontend.md` §4, §8).
4. Restyle auth + student shell pages (`02-frontend.md` §5, §6, §11).
5. Apply chat SQL, build snapshot helper, build the four API routes (`03-feature-teacher-chat.md`).
6. `pnpm run build` + `pnpm exec eslint . --max-warnings 0` green.

### Day 2 — teacher chat UI + polish + role gating

1. Build chat UI components and pages (`03-feature-teacher-chat.md`).
2. Add `ChatHeroCard` to top of `/teacher/dashboard`.
3. Audit role gating (`04-roles.md` §5).
4. Add `app/error.tsx` and `app/not-found.tsx` using new tokens.
5. Smoke-test the demo path: signup → upload Cambridge PDF → answer with image → hint → teacher login → dashboard hero → ask three questions → check chat persists across refresh.
6. Final `pnpm run build` + ESLint pass.

## Local demo run

```powershell
cd "c:\DIGITAL SYSTEMS PROJECT\DIGITAL-SYSTEMS-PROJECT\studyai"
pnpm install
pnpm run dev
```

Open `http://localhost:3000`. No Vercel deployment.

## Out of scope (do not start)

- Achievements / badges system.
- `TESTING.md` formal test log.
- Deployment.
- Streaming chat responses (non-streaming first).
- Restyling anything inside `app/papers/[id]/*`.

## Final deliverable

A clean uncommitted diff. End with a 6-line summary: tokens changed, pages restyled, SQL applied, API routes added, UI components added, build/lint result.

---

## Top-level checklist

- [ ] `01-context.md` read and understood.
- [ ] `02-frontend.md` checklist complete.
- [ ] `03-feature-teacher-chat.md` checklist complete.
- [ ] `04-roles.md` checklist complete.
- [ ] Day 1: build green, lint green.
- [ ] Day 2: build green, lint green.
- [ ] Smoke test passes locally.
- [ ] 6-line change summary produced.
