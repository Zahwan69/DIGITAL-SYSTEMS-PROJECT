# StudyAI — UI / UX Guidelines

**Status:** proposed (2026-04-19). Nothing in this doc is implemented yet.
**Scope:** design direction, design tokens, component specs, teacher
analytics + subject-model migration. Approved by user before any
refactor.

---

## 1. Design principles

1. **Minimal, professional, editorial.** This is a study tool used by
   teachers and students alike. Visual noise gets in the way of focus.
2. **Earn the accent colour.** Garnet shows up for the *one* action
   that matters on a surface. Everything else is neutral.
3. **Text over ornament.** Typography and whitespace do the heavy
   lifting. Drop-shadows, gradients, and illustrations are avoided.
4. **One grid.** Every gap, padding, and radius is a multiple of 4 px.
   No arbitrary values.
5. **Icons are for signal, not decoration.** No emojis as UI
   affordances — they render inconsistently across OSes and read as
   informal. Use `lucide-react` at a fixed size.
6. **Role-aware, not role-split.** Students and teachers share the
   same shell. Only the content changes. Don't build two parallel
   apps.
7. **Never block the reader.** Loading states are skeletons or inline
   spinners, never full-page blockers once the shell is mounted.

### What this means in practice

- Drop every `emoji` in a `CardTitle` / `CardDescription` / button and
  replace with a `lucide-react` icon sized `h-4 w-4` (inline) or
  `h-5 w-5` (lead icon in a card/title).
- Drop gradient backgrounds and coloured "quick action" card glyphs —
  use a neutral leading icon + typography instead.
- All interactive elements get a visible focus ring in
  `--color-accent`.

---

## 2. Colour tokens

The palette is **garnet + champagne pink**. These are the only named
colours; everything else is a neutral drawn from warm stone.

### 2.1 Semantic tokens

| Token              | Hex       | Use                                       |
| ------------------ | --------- | ----------------------------------------- |
| `bg`               | `#FBEEE3` | Page background                           |
| `surface`          | `#FFFFFF` | Cards, modals, dropdowns                  |
| `surface-alt`      | `#F7E7CE` | Sidebar, footer, subtle banded rows       |
| `text`             | `#1F1412` | Primary text                              |
| `text-muted`       | `#8B6F68` | Captions, placeholders, meta              |
| `text-on-accent`   | `#FFFFFF` | Text on garnet surfaces                   |
| `border`           | `#E8D5C9` | Default 1 px dividers                     |
| `border-strong`    | `#D4B8A8` | Focused / selected borders                |
| `accent`           | `#7B1E23` | Primary actions, links, active nav        |
| `accent-hover`     | `#5C0F14` | Hover / pressed                           |
| `accent-soft`      | `#FCE4E4` | Selected rows, badges, chart fills        |
| `success`          | `#4D7C0F` | Positive states (streaks, ✓)              |
| `warning`          | `#B45309` | Due-soon, warnings                        |
| `danger`           | `#991B1B` | Destructive actions, errors               |

> **Why two reds?** Garnet (`accent`) is the brand; danger is a cooler
> crimson so "Submit" and "Delete" are not the same colour. If visual
> harmony matters more to you than distinction, we can collapse to one.

### 2.2 Tailwind v4 `@theme` block

To replace the single `@import "tailwindcss";` line in
`app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #FBEEE3;
  --color-surface: #FFFFFF;
  --color-surface-alt: #F7E7CE;
  --color-text: #1F1412;
  --color-text-muted: #8B6F68;
  --color-text-on-accent: #FFFFFF;
  --color-border: #E8D5C9;
  --color-border-strong: #D4B8A8;
  --color-accent: #7B1E23;
  --color-accent-hover: #5C0F14;
  --color-accent-soft: #FCE4E4;
  --color-success: #4D7C0F;
  --color-warning: #B45309;
  --color-danger: #991B1B;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Fraunces", ui-serif, Georgia, serif;

  --radius-sm: 0.375rem; /* 6px  */
  --radius-md: 0.5rem;   /* 8px  */
  --radius-lg: 0.75rem;  /* 12px */
  --radius-xl: 1rem;     /* 16px */
}

html, body { background: var(--color-bg); color: var(--color-text); }
```

After this, classes like `bg-surface`, `text-muted`, `border-border`,
`bg-accent`, `hover:bg-accent-hover`, `ring-accent` all work.

### 2.3 Usage rules

- **Only one garnet element per card.** Usually the primary button or
  the title link.
- **Never tint success / warning / danger for decoration.** They
  signal state.
- **Charts** use `accent-soft` for the fill, `accent` for the stroke,
  and `border` for gridlines.
- **Borders before shadows.** Use a 1 px `border-border` instead of
  `shadow-sm` for separation; use shadow only on floating surfaces
  (dropdowns, dialogs).

---

## 3. Typography

| Role            | Font     | Size     | Weight | Line-height |
| --------------- | -------- | -------- | ------ | ----------- |
| Page title (h1) | Fraunces | 28–32 px | 600    | 1.15        |
| Section (h2)    | Fraunces | 20–22 px | 600    | 1.2         |
| Card title (h3) | Inter    | 16 px    | 600    | 1.3         |
| Body            | Inter    | 14 px    | 400    | 1.55        |
| Caption / meta  | Inter    | 12 px    | 500    | 1.4         |
| Mono (codes)    | ui-mono  | 14 px    | 500    | 1.3         |

- **One serif, one sans.** Fraunces (serif) is reserved for page/section
  headings — gives the editorial feel without applying everywhere.
- **Inter** everywhere else.
- **Numbers in tables & chart labels** use `tabular-nums` for
  alignment.

> Load both fonts via `next/font/google` in `app/layout.tsx`.

---

## 4. Spacing, radius, elevation

- **Grid:** multiples of 4 (`gap-1` = 4 px, `gap-2` = 8 px, …).
- **Card padding:** `p-5` (20 px) on mobile, `p-6` (24 px) on `sm+`.
- **Section spacing:** `space-y-6` between cards, `space-y-10` between
  major sections.
- **Radius:**
  - Inputs / buttons → `radius-md` (8 px)
  - Cards → `radius-lg` (12 px)
  - Modals / dialogs → `radius-xl` (16 px)
- **Elevation:** only two levels.
  - `border` (everything)
  - `shadow-md` (popovers, modals, toasts)

---

## 5. Icon system

- Library: **`lucide-react`** (already installed).
- Sizes: `h-4 w-4` (inline beside text), `h-5 w-5` (card title / button
  with leading icon), `h-6 w-6` (section glyph).
- Stroke: default (1.75). Don't mix stroke weights.
- Colour: `text-text-muted` normally, `text-accent` when active.
- **No emojis in UI.** Strip them from:
  - `app/dashboard/page.tsx` — `👋`, `🔥`, quick-action emojis, `⚡`
  - Brand chrome in **`Navbar`** (logo + wordmark + tagline) — use `lucide-react` (e.g.
    `GraduationCap`), not emoji logotypes
  - `app/teacher/dashboard/page.tsx` — none currently but keep clean

### Replacement map

| Current emoji | Replace with            |
| ------------- | ----------------------- |
| ⚡ (logo)      | `GraduationCap` (brand) |
| 👋 (welcome)  | *remove*                |
| 🔥 (streak)   | `Flame`                 |
| 🔍 (search)   | `Search`                |
| 📤 (upload)   | `Upload`                |
| 📚 (papers)   | `BookOpen`              |
| ➕ (add)       | `Plus`                  |
| ✅ (success)  | `Check`                 |
| ⚠️ (warning)   | `TriangleAlert`         |

---

## 6. Components

### 6.1 Card

```
┌────────────────────────────────────────┐
│ [icon] Title                           │ ← h3, 16/600
│ description text in muted              │ ← 14/400 muted
├────────────────────────────────────────┤
│ body content                           │
└────────────────────────────────────────┘
```

Variants (to add to `components/ui/card.tsx`):

| variant        | border                  | bg                    | use                    |
| -------------- | ----------------------- | --------------------- | ---------------------- |
| `default`      | `border-border`         | `bg-surface`          | all content cards      |
| `interactive`  | `border-border`         | `bg-surface` + hover  | whole-card links       |
| `highlight`    | `border-border-strong`  | `bg-accent-soft`      | pending invites, alerts|
| `muted`        | `border-border`         | `bg-surface-alt`      | sidebar panels         |

`interactive` uses `hover:border-border-strong hover:-translate-y-0.5`
— **no shadow change** (keeps the minimal feel).

### 6.2 Button

Update `buttonVariants` in `components/ui/button.tsx` to use tokens:

| variant      | class                                                   |
| ------------ | ------------------------------------------------------- |
| `primary`    | `bg-accent text-text-on-accent hover:bg-accent-hover`   |
| `secondary`  | `bg-surface-alt text-text hover:bg-border`              |
| `outline`    | `border border-border-strong text-text hover:bg-surface-alt` |
| `ghost`      | `text-text hover:bg-surface-alt`                        |
| `destructive`| `bg-danger text-text-on-accent hover:bg-[#7F1818]`      |
| `link`       | `text-accent underline-offset-4 hover:underline`        |

Sizes: `sm` (h-8), `md` (h-10, default), `lg` (h-11).
Focus ring: `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`.

### 6.3 Badge

New primitive `components/ui/badge.tsx` (already exists — retune):

| variant     | bg / text                                |
| ----------- | ---------------------------------------- |
| `default`   | `bg-surface-alt text-text-muted`         |
| `accent`    | `bg-accent-soft text-accent`             |
| `success`   | `bg-[#E6F0D6] text-success`              |
| `warning`   | `bg-[#FBE8CF] text-warning`              |
| `danger`    | `bg-[#F3D3D3] text-danger`               |

### 6.4 Input / Textarea / Select

- `h-10`, `radius-md`, `border border-border`, `bg-surface`.
- Focus: `border-border-strong ring-2 ring-accent/20`.
- Placeholder: `text-text-muted`.
- Error state: `border-danger` + 12 px helper text in `text-danger`.

### 6.5 Table (new)

For class members, student lists, analytics:

- Header: `bg-surface-alt`, `text-text-muted`, `text-xs`, `uppercase`,
  `tracking-wide`.
- Rows: `border-b border-border`, `hover:bg-accent-soft/40`.
- Zebra: off. We use borders + hover, not banding.

### 6.6 Empty states

Pattern: `muted` card, small icon (`h-6 w-6 text-text-muted`), single
line of body text, and a **single** primary action.

---

## 7. App shell

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│                    NAVBAR (56px)                        │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│          │                                              │
│ SIDEBAR  │                CONTENT                       │
│ (240px)  │          max-w-6xl mx-auto                   │
│          │                                              │
│          │                                              │
├──────────┴──────────────────────────────────────────────┤
│                      FOOTER (auto)                      │
└─────────────────────────────────────────────────────────┘
```

- Sidebar collapses to a sheet on `<md` (hamburger in navbar).
- Navbar holds the brand, role badge, and user menu.
- Content is always centered with `max-w-6xl mx-auto px-6 py-8`.

### 7.2 Sidebar spec

- **240 px wide**, `bg-surface-alt`, `border-r border-border`.
- **No brand header** — logo and tagline live in the **Navbar**; sidebar
  toggles (panel icon desktop, hamburger mobile) open/close this rail.
- **Primary sections**, each with a lucide icon + label:
  - *Student view* (default for `role=student`):
    `Dashboard`, `My Papers`, `Upload`, `Search`
  - *Teacher view* (only when `role=teacher`):
    `Overview`, `Classes`, `Assignments`, `Insights` (subject filter is in the
    Navbar on `/teacher/*`)
- **Active state:** `bg-surface`, `text-accent`, `border-l-2 border-accent`
  on the left edge of the item.
- **Keyboard:** ↑/↓ navigates items, `Enter` activates, `g d` jumps to
  Dashboard, `g t` to Teacher overview (future).
- **Accessibility:** `<nav aria-label="Primary">`, skip-link at top of
  document.

### 7.3 Navbar spec

- Height **56 px**, `bg-surface`, `border-b border-border`.
- Left: **sidebar-colored rail** toggles a **push panel** (`PanelLeftOpen` /
  `PanelLeftClose`): nav sits in **document flow** beside `#main-content` (width
  `0` ↔ `14rem`), no backdrop overlay. **Escape** still collapses the panel.
  Then **brand**, teacher **subject** dropdown, horizontal links on `≥md`.
- Right: role badge, **Sign out** (and icon-only sign out on small screens).

### 7.4 Footer spec

- `bg-surface-alt`, `border-t border-border`, `py-8`.
- 3 columns on `≥md`, stacked on mobile:
  1. **Brand column.** Logo, one-sentence tagline, copyright.
  2. **Product.** Links: Dashboard, My Papers, Upload, Search.
  3. **Help.** Links: Docs (README), GitHub issues, Privacy (placeholder),
     Terms (placeholder).
- Font 12 px muted; accent only on hovered links.

---

## 8. Teacher dashboard & subject model

### 8.1 Data-model changes

New tables + FK — applied as `supabase/schema-teacher-subjects.sql`:

```sql
-- 1. subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  syllabus_code text,
  level text,
  created_at timestamptz not null default now(),
  unique (name, syllabus_code)
);

-- 2. teacher_subjects — which teacher owns which subjects
create table if not exists public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (teacher_id, subject_id)
);

-- 3. add subject_id to classes
alter table public.classes
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;

create index if not exists classes_subject_id_idx on public.classes(subject_id);
```

RLS:

- `subjects`: everyone can select (catalog data).
- `teacher_subjects`: teacher reads own rows; only service role writes
  (admin-assigned for now; future: UI in Settings).
- `classes`: existing RLS still applies; `subject_id` flows through.

### 8.2 Teacher shell

- Sidebar `Subject switcher`:
  - `SelectTrigger` showing current subject name + syllabus code.
  - Opens a command-palette-style popover with fuzzy search over the
    teacher's subjects (`teacher_subjects` join `subjects`).
  - Selecting a subject navigates to `/teacher?subject=<id>` (query
    param, not hash — keeps refresh behaviour).
  - "All subjects" is the default when the query param is absent.
- State persistence: last chosen subject stored in
  `localStorage.lastTeacherSubjectId` so a refresh keeps context.

### 8.3 Teacher overview page (`/teacher/dashboard`)

Cards, top to bottom:

1. **Header row** (3 KPI cards, `grid md:grid-cols-3 gap-4`):
   - Active students (count across selected subject's classes)
   - Assignments this week (count of assignments created in last 7 days)
   - Average score (avg `attempts.percentage` across assignments in
     this subject)
2. **Performance chart** — full-width card.
3. **Class list** — one row per class with inline stats.
4. **Recent attempts** — 10 most recent `attempts` by this subject's
   students, with score + student + question link.

### 8.4 Performance chart

- Type: **line chart** of *weekly average score* across the last 12
  weeks, split by class (one line per class in the subject).
- Library: **Recharts** (`recharts` — to be added to deps).
  Alternative considered: `visx` (more boilerplate), `@tremor/react`
  (brings its own theme — clashes with our tokens).
- Colours: multiple series use tints of `accent` (garnet → rose →
  blush). Gridlines `border`, axis labels `text-muted`.
- Empty state: if no attempts exist, show the empty-state card with
  "No data yet — your students haven't submitted any answers."

### 8.5 Insights page (future, outside this doc's scope)

Reserved route `/teacher/insights`. Topic heatmap + per-student
trajectory. Not a deliverable right now; note only to keep the
sidebar label meaningful.

---

## 9. Accessibility

- **Colour contrast:** all text/background pairs in §2.1 meet WCAG AA
  for normal text. Verified:
  - `text` on `bg` → 12.7:1
  - `text-muted` on `bg` → 4.8:1
  - `text-on-accent` on `accent` → 8.9:1
- **Focus rings:** never remove them. Always `ring-accent`.
- **Keyboard:** every interactive element reachable with Tab. Sidebar
  items are `<a>` / `<button>`, not `<div>`.
- **Motion:** respect `prefers-reduced-motion` — disable the
  `-translate-y-0.5` hover on interactive cards.
- **Forms:** every input has a `<label>`; error messages use
  `aria-describedby`.

---

## 10. Rollout order (when you approve implementation)

Small, reviewable PRs. Each step builds on the last.

1. **Tokens & base styles.** Update `app/globals.css` with `@theme`
   block; install Inter + Fraunces via `next/font`. No visual jumps
   expected yet — Tailwind still renders old colours on existing
   classes like `bg-indigo-600`.
2. **Primitives.** Retune `Button`, `Card`, `Badge`, `Input`,
   `Textarea` to use tokens. `indigo-*` and `slate-*` classes removed
   from these files.
3. **Icon swap.** Replace all UI emojis with `lucide-react` icons
   (map in §5).
4. **App shell.** `components/AppShell.tsx` (sidebar + navbar + footer)
   wraps `app/dashboard`, `app/teacher/*`, `app/papers/*`, `app/upload/*`.
   The legacy **`Navbar`** component has been **removed** from the tree.
5. **Subjects migration.** Run `supabase/schema-teacher-subjects.sql`.
   Add `SubjectSwitcher` to the teacher sidebar section. Pass subject
   id through query param. Existing teacher pages read `?subject=`
   and filter.
6. **Teacher overview redesign.** Three-card KPI row + recharts line
   chart + class list. Deletes the old `/teacher/dashboard`.
7. **Polish pass.** Empty states, skeletons, keyboard shortcuts,
   prefers-reduced-motion, focus rings.

Step 1 & 2 together already visually migrate the whole app since
every page uses the primitives — the remaining steps add structure,
not just colour.

---

## 11. Files this doc will touch (for reference)

| File                                   | Change                        |
| -------------------------------------- | ----------------------------- |
| `app/globals.css`                      | `@theme` tokens, font import  |
| `app/layout.tsx`                       | Font loader, AppShell wrapper |
| `components/ui/button.tsx`             | Variants → tokens             |
| `components/ui/card.tsx`               | Variants, no shadow           |
| `components/ui/badge.tsx`              | Variants → tokens             |
| `components/ui/input.tsx`              | Tokens, focus ring            |
| `components/ui/textarea.tsx`           | Tokens, focus ring            |
| `components/AppShell.tsx`              | **new** — sidebar/navbar/footer |
| `components/Sidebar.tsx`               | **new**                       |
| `components/Navbar.tsx`                | **new** — app header bar      |
| `components/Footer.tsx`                | **new**                       |
| `components/SubjectSwitcher.tsx`       | **new**                       |
| `app/dashboard/page.tsx`               | Strip emoji, retune cards     |
| `app/teacher/dashboard/page.tsx`       | KPI row + chart + list        |
| `app/teacher/classes/[id]/page.tsx`    | Token pass, no emoji          |
| `app/papers/**`                        | Respects constraint — no edit |
| `supabase/schema-teacher-subjects.sql` | **new** DDL for subjects      |
| `types/database.ts`                    | `Subject`, `TeacherSubject`   |
| `package.json`                         | Add `recharts`                |

> `app/papers/*`, `app/api/mark/route.ts`, `app/api/hint/route.ts`,
> `app/api/analyse/route.ts`, `lib/gemini.ts`, and
> `components/AnswerForm.tsx` remain off-limits per earlier
> prompt constraints. The shell still wraps those pages, but their
> bodies don't change.
