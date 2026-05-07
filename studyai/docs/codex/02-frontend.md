# 02 — Frontend (visual rebuild)

The current garnet/Fraunces palette is being dropped. Move to **Apple × Vercel monochrome minimalism**: generous whitespace, big type, hairline borders, no heavy shadows, no gradients beyond a controlled monochrome ramp. Aceternity UI is the second visual lane (admin + teacher + every button). See §10.

---

## 1. Tokens — replace the existing block in `app/globals.css`

Keep the **token names** (other components depend on them); only change values.

| Token | New value | Notes |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-surface` | `#FFFFFF` | Cards |
| `--color-surface-alt` | `#FAFAFA` | Sidebar, subtle wells |
| `--color-text` | `#0A0A0A` | Primary text |
| `--color-text-muted` | `#6E6E73` | Apple secondary grey |
| `--color-text-on-accent` | `#FFFFFF` | Text on solid accent |
| `--color-border` | `#E5E5E7` | Hairline |
| `--color-border-strong` | `#D2D2D7` | Hover/active borders |
| `--color-accent` | `#0A0A0A` | Buttons, focus ring — black, **not** garnet |
| `--color-accent-hover` | `#1F1F1F` | |
| `--color-accent-soft` | `#F5F5F7` | Apple grey wash |
| `--color-success` | `#15803D` | |
| `--color-warning` | `#B45309` | |
| `--color-danger` | `#B91C1C` | |

## 2. Typography

- Drop **Fraunces**. Use **Inter** for everything (already loaded). Keep the `font-serif` token alias but point it at Inter so any stray usage doesn't break.
- Display sizes (Tailwind arbitrary values are fine):
  - Display 1: `text-[72px] leading-[1.05] tracking-[-0.025em] font-semibold` (mobile: `text-[44px]`)
  - Display 2: `text-[48px] leading-[1.1] tracking-[-0.02em] font-semibold` (mobile: `text-[32px]`)
  - Heading: `text-[28px] leading-tight tracking-[-0.01em] font-semibold`
  - Body: `text-base leading-[1.65]`
  - Eyebrow / label: `text-sm tracking-wide uppercase text-[--color-text-muted]`

## 3. Components

- Buttons: filled black (default) and outline (ghost). 10px radius, 40px height, no shadow.
- Cards: white surface, 12px radius, 1px hairline border. No drop shadow except on the chat composer.
- Inputs: 10px radius, 1px border, focus ring is `2px solid #0A0A0A` with 2px offset.
- Dividers: 1px hairlines using `--color-border`.
- Motion: `cubic-bezier(0.22,1,0.36,1)` 200ms for hover/focus; respect existing `prefers-reduced-motion` rule.

## 4. Landing page (`app/page.tsx`) — Apple-style cover

Full rewrite. Sections, top to bottom:

1. **Top bar** — replaced by Aceternity Floating Navbar (see §11). Do not use `AppShell` on this page.
2. **Hero** — full-viewport (`min-h-[100svh]`) centred. Eyebrow "AI past-paper practice" → Display 1 headline "Study smarter." → 1-line subhead in muted grey → two CTAs (black `Get started free`, ghost `See how it works`). Generous vertical breathing room (≥120px above + below). Hero visual image slot below CTAs (see §8).
3. **Feature triptych** — 3-column grid (`grid-cols-1 md:grid-cols-3`), each cell: image slot (§8), lucide icon (24px, stroke 1.5), Heading, 2-line description. Topics: *Upload any past paper*, *AI grades like an examiner*, *Track topics + streaks*.
4. **How it works** — 4 numbered steps, alternating left/right with a screenshot on the opposite side. Use placeholder `<div>`s with `aspect-[16/10] bg-[--color-surface-alt]` if real screenshots aren't ready.
5. **Closing CTA** — single oversized line "Start your first paper." + black button. Optional closing image slot above (§8).
6. **Footer** — see §11.

## 5. Auth pages (`app/auth/login`, `app/auth/signup`)

Centred card on a `bg-[--color-surface-alt]` page. 400px max width. Same minimalist styling. Keep all existing form logic.

## 6. Student shell (`AppShell`, top bar, mobile drawer)

- Desktop ≥1024px: top bar nav (no sidebar). 56px tall, hairline bottom border, logo left, items centred, role pill + sign-out right. See §11 for full spec.
- Mobile <1024px: same top bar, hamburger-equivalent (logo-as-toggle) opens left drawer with the full nav.

## 7. Acceptance for the design pass

- No raw hex in JSX — only tokens.
- Every page passes Lighthouse contrast.
- Landing page renders correctly at 375px and 1440px.
- `pnpm run build` green.

## 8. AI-generated art slots (landing page)

Wire the slots in JSX during the build. PNGs are generated **post-build** and dropped into `studyai/public/images/landing/`. Until then, ship a 1×1 transparent `placeholder.png` so `next/image` does not throw, and let the `bg-[--color-surface-alt]` fallback show through.

| Slot | Path | Rendered | Source asset (2× retina) | Where it goes |
|---|---|---|---|---|
| Hero visual | `/images/landing/hero.png` | 1200×800 | 2400×1600 | Below the hero CTAs, full-bleed within `max-w-6xl`, `aspect-[3/2]`, `rounded-2xl`, hairline border |
| Feature 1 — Upload | `/images/landing/feature-upload.png` | 480×360 | 960×720 | Top of feature card 1, `aspect-[4/3]`, `rounded-xl`, `bg-[--color-surface-alt]` behind |
| Feature 2 — Grading | `/images/landing/feature-grading.png` | 480×360 | 960×720 | Top of feature card 2 |
| Feature 3 — Progress | `/images/landing/feature-progress.png` | 480×360 | 960×720 | Top of feature card 3 |
| Closing CTA visual | `/images/landing/closing.png` | 1200×600 | 2400×1200 | Above the closing CTA line, `aspect-[2/1]`, optional — render only if file present |

Implementation notes:
- Use `next/image` with explicit `width`/`height` and `priority` only on the hero.
- Wrap each `<Image>` in a `<div>` with the same aspect-ratio class so layout doesn't shift if the file is missing.
- Treat all five as **decorative** — pass `alt=""` and `aria-hidden="true"`.
- `next.config.ts` already allows local images; do not edit it.

## 9. Image generation prompts (run in GPT image / DALL·E after the build is green)

Style baseline shared across every prompt — paste this preface in front of each prompt below:

> *Minimalist editorial illustration in the style of Apple marketing × Vercel. Monochrome palette: pure white background (#FFFFFF), near-black ink (#0A0A0A), Apple grey accents (#F5F5F7 and #6E6E73). Soft, even, diffuse light. No text, no logos, no watermarks, no UI chrome, no people, no hands. Lots of negative space. Crisp matte finish, no gradients beyond subtle ambient shading, no glossy highlights, no 3D bevel. Composition centred with generous margin.*

| # | Slot | Aspect | Prompt body |
|---|---|---|---|
| 1 | `hero.png` | 3:2 | A single sheet of paper floating slightly above a flat surface, gently curling at one corner, casting a very soft shadow. The paper is blank except for a few faint horizontal rule lines suggested in pale grey. The composition reads like a calm, premium product photograph — the paper is the subject, framed by deep negative space on all sides. Slightly off-centre for visual interest. |
| 2 | `feature-upload.png` | 4:3 | A stack of three minimal paper sheets fanning out at small angles, viewed from a shallow top-down perspective. The top sheet has a small subtle upward arrow embossed (no colour, just a very faint grey form). Calm, still, document-like. |
| 3 | `feature-grading.png` | 4:3 | A single paper sheet seen straight on, with three small minimalist tick marks placed down its left margin in soft charcoal ink. The ticks are clean line strokes, evenly spaced, no other marks on the page. Restrained and editorial. |
| 4 | `feature-progress.png` | 4:3 | An abstract minimal staircase made of three to four flat rectangular blocks ascending left to right, each block in a slightly different shade of soft grey, sitting on a clean white floor. Reads as quiet, steady progress. |
| 5 | `closing.png` (optional) | 2:1 | A wide horizon composition: a single thin charcoal line drawn confidently across a vast white field, slightly thicker on the right end. Suggestive of momentum and a finished mark. Pure calm. |

Generation tips:
- Render each at 2× target dimensions, then export as PNG with sRGB.
- Aim for under 250KB after compression (`squoosh` / `oxipng`). Hero can go to 400KB.
- If a render comes back with stray text or UI artefacts, reroll — do not edit by hand.

## 10. Aceternity UI integration

Aceternity is the **second** visual lane: used for every button project-wide, and as the primary primitive set for `app/admin/*` and `app/teacher/*` pages. Public + student pages remain on monochrome minimalism — only the shared button comes from Aceternity there.

Install (propose via CLI; do not edit `package.json` by hand):

```
pnpm add motion clsx tailwind-merge class-variance-authority
```

Aceternity is copy-paste source, not a package. Copy each component below from `ui.aceternity.com` into `components/aceternity/<filename>` and adapt imports to local `cn` from `lib/utils.ts`.

| Aceternity component | Local path | Used for |
|---|---|---|
| Moving Border | `components/aceternity/moving-border.tsx` | The single global button (`components/ui/button.tsx` wraps this) |
| Sidebar (animated) | `components/aceternity/sidebar.tsx` | Admin sidebar (desktop) + mobile drawer |
| Floating Navbar | `components/aceternity/floating-navbar.tsx` | Public landing top bar |
| Bento Grid | `components/aceternity/bento-grid.tsx` | `/teacher/dashboard` and `/admin/dashboard` top section |
| Card Hover Effect | `components/aceternity/card-hover-effect.tsx` | KPI cards, admin tables hover, teacher chat sidebar items |
| Hover Border Gradient | `components/aceternity/hover-border-gradient.tsx` | Suggestion chips on `ChatHeroCard` |

Constraints:

1. **Monochrome only.** Aceternity defaults ship cyan/purple gradients — replace every gradient stop with the §1 tokens (`--color-text`, `--color-accent-soft`, `--color-border`). No rainbow, no cyan, no violet anywhere.
2. **One button.** `components/ui/button.tsx` is rebuilt to wrap Moving Border. Every existing `<Button>` import keeps working with no JSX changes elsewhere.
3. **Reduced-motion fallback.** Every Aceternity component must be wrapped in a check that swaps the animated render for a static one when `(prefers-reduced-motion: reduce)` is true. The existing global rule in `globals.css` is not enough — Aceternity drives motion via JS, not CSS animations.
4. **No deep imports.** Do not pull anything from Aceternity that isn't in the table above.
5. **Bundle.** Confirm the final build does not regress route JS by more than +60KB gzipped on the landing page or +120KB on the authed shell. If it does, reroll the component choice (e.g. drop Bento Grid in favour of a plain CSS grid).

Acceptance:

- One global `<Button>` component, used everywhere, with the Moving Border treatment in the default variant and a static ghost variant.
- Admin and teacher dashboards render Bento Grid + animated Sidebar; reduced-motion users see a static grid + static sidebar.
- `pnpm run build` green; no `motion`/framer-motion `"use client"` errors.

## 11. Footer and Navbar/Sidebar rework

### Public landing top bar

Replace the §4 sticky bar with Aceternity Floating Navbar:
- Pill shape, 999px radius, centred horizontally, anchored `top-4`.
- ~720px wide collapsed, ~640px after scroll past 200px (animate width + horizontal padding).
- `bg-white/75 backdrop-blur-xl`, hairline border `border-[--color-border]`, no shadow.
- Items: `Features`, `How it works`, `Sign in` (text), `Get started` (Moving Border button).
- Hide on scroll-down past hero, reveal on scroll-up (mirror Apple).

### Public landing footer

Two stacked layers:
1. Top layer (240px tall): three columns — Product / Resources / Legal — monochrome links, hairline divider above.
2. Bottom layer: oversized quiet wordmark — `StudyAI` rendered at `text-[clamp(96px,18vw,240px)] tracking-[-0.04em] leading-[0.85] font-semibold text-[--color-text]`, clipped on the bottom by `overflow-hidden` so only the upper ~70% of the glyphs is visible. Single © line below at `text-xs text-[--color-text-muted]`. This is the Apple "big quiet wordmark" footer move.

### Authed shell — split by viewport and by role area

The sidebar is no longer the primary nav on desktop for student + teacher. It is reserved for `/admin/*` on desktop, and it returns as a mobile drawer for everyone under 1024px.

**Desktop (≥1024px), student + teacher pages.** No sidebar. Top bar carries the full nav inline:
- Left: logo wordmark.
- Centre: nav items (`Dashboard`, `My Papers`, `Upload`, `Search` for students; teacher items when `role === 'teacher'`). Active item underlined with a 2px black bar, no fill.
- Right: role pill, then sign-out as a small Moving Border button.
- Bar is 56px, hairline bottom border, no shadow.
- `AppShell` swaps `Sidebar` for this top bar at the `lg:` breakpoint.

**Desktop (≥1024px), admin pages (`/admin/*`).** Aceternity-style collapsible sidebar:
- Default state: collapsed at 72px, icons only, logo block at the top.
- **The logo block itself is the toggle.** Click anywhere in the logo area (full 72×72 hit target) to expand the sidebar to 248px and slide labels in. Click the logo again — or click anywhere outside the sidebar — to collapse.
- **No chevron, no arrow, no caret, no hamburger lines, no toggle button anywhere.** The cursor changes to `pointer` over the logo area; that is the only affordance.
- Items: lucide icon (24px, stroke 1.5) centred when collapsed, icon + label when expanded.
- Active item: solid black background, white text, 8px radius. Hover: 1px Moving Border ring; no fill change.
- Persistence: remember the last expanded/collapsed state in `localStorage.adminSidebarExpanded`. Default collapsed on first visit.
- Reduced-motion: width change becomes instant; label fade becomes instant.
- Top bar on admin pages stays 56px and only shows breadcrumb + role pill + sign-out (no nav items, since nav lives in the sidebar).

**All viewports under 1024px (every role).** The top bar shows logo left + a single icon button on the right that opens a left sheet drawer containing the full nav (student + teacher + admin items, role-gated as today). The drawer **also uses the logo-as-toggle pattern** at the top of the sheet rather than a close button — tap the logo or tap the scrim to close. Still no chevron, no X. (`Esc` closes for keyboard users; aria-label on the logo button reads "Toggle navigation".)

### Authed top bar (`Navbar.tsx`)

56px tall, hairline bottom border:
- Left: logo (mobile only — desktop logo lives in the topbar nav for student/teacher, in the sidebar for admin) + animated breadcrumb that slides up + fades on route change (200ms).
- Right: role pill, then sign-out as a small Moving Border button (admin only — student/teacher already have it in the topbar nav).

### Authed footer

Drop the marketing footer entirely on authed routes. Replace with a 32px-tall thin bar: centred `text-xs text-[--color-text-muted]` showing `StudyAI · v0.1 · local`. Quiet chrome.

### Acceptance for §11

- Floating Navbar resizes on scroll without layout shift behind it.
- Big-wordmark footer does not cause horizontal scroll at 375px (clip with `overflow-x-hidden` on the layer, not the page).
- At ≥1024px on student/teacher pages, the DOM contains **no** sidebar element — only the top bar.
- At ≥1024px on `/admin/*`, clicking the logo block toggles the sidebar; there is no chevron/arrow/caret/X icon anywhere on the sidebar or its trigger. Grep the new code for `ChevronLeft`, `ChevronRight`, `ChevronDown`, `Menu`, `X` icons inside sidebar files — should be zero matches.
- Under 1024px, the drawer opens via the right-side logo-toggle button and closes via tapping the logo, the scrim, or pressing `Esc`. Again no visible chevron/X.
- `localStorage.adminSidebarExpanded` persists across reloads.

---

## Frontend checklist

### Tokens & typography
- [ ] Replace token block in `app/globals.css` with §1 values.
- [ ] Drop Fraunces; point `font-serif` alias at Inter; remove Fraunces import in `app/layout.tsx`.
- [ ] Verify no JSX uses raw hex (grep for `#[0-9A-Fa-f]{3,6}` in `app/` and `components/` excluding `globals.css`).

### Aceternity install + components
- [ ] Run `pnpm add motion clsx tailwind-merge class-variance-authority` (only if not already installed).
- [ ] Copy `moving-border.tsx` into `components/aceternity/`.
- [ ] Copy `sidebar.tsx` into `components/aceternity/`.
- [ ] Copy `floating-navbar.tsx` into `components/aceternity/`.
- [ ] Copy `bento-grid.tsx` into `components/aceternity/`.
- [ ] Copy `card-hover-effect.tsx` into `components/aceternity/`.
- [ ] Copy `hover-border-gradient.tsx` into `components/aceternity/`.
- [ ] Adapt every Aceternity component to use only §1 tokens (no cyan/violet defaults).
- [ ] Wrap each component in a reduced-motion guard.
- [ ] Rebuild `components/ui/button.tsx` to wrap Moving Border (default variant) + ghost variant.

### Public landing
- [ ] Rewrite `app/page.tsx` per §4.
- [ ] Use Aceternity Floating Navbar at the top per §11.
- [ ] Wire the five `next/image` slots from §8.
- [ ] Create `public/images/landing/placeholder.png` (1×1 transparent PNG) so the build does not 404.
- [ ] Implement big-quiet-wordmark footer per §11.

### Auth + student shell
- [ ] Restyle `app/auth/login/page.tsx` per §5.
- [ ] Restyle `app/auth/signup/page.tsx` per §5.
- [ ] Restyle `app/dashboard/page.tsx`.
- [ ] Restyle `app/upload/page.tsx`.
- [ ] Restyle `app/papers/page.tsx`.
- [ ] Restyle `app/papers/search/page.tsx`.
- [ ] **Do not** restyle `app/papers/[id]/page.tsx` (locked).

### Authed shell (sidebar + topbar + footer)
- [ ] Implement student/teacher desktop topbar inline nav per §11.
- [ ] Implement admin desktop sidebar with logo-as-toggle (no chevron/arrow icons anywhere).
- [ ] Persist `localStorage.adminSidebarExpanded`.
- [ ] Implement mobile drawer with logo-as-toggle (no X icon).
- [ ] Replace marketing footer with quiet 32px footer on authed routes.
- [ ] Grep new sidebar files for `ChevronLeft|ChevronRight|ChevronDown|Menu|X` — must return zero.

### Verification
- [ ] `pnpm run build` green.
- [ ] `pnpm exec eslint . --max-warnings 0` green.
- [ ] Landing page renders correctly at 375px and 1440px.
- [ ] Bundle delta within +60KB landing / +120KB authed shell budget.
