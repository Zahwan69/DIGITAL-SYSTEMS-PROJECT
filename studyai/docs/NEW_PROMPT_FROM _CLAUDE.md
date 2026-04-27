
    1 # Cursor prompt — StudyAI image support (Option B)
    2
    3 Paste everything below the `---` line into Cursor (Composer / Agent mode).
    4 It is self-contained: a state snapshot, a temporary lock-lift, four work
    5 tracks, acceptance criteria, and verification commands.
    6
    7 ---
    8
    9 ## Project state snapshot (read before acting)
   10
   11 - **Framework:** Next.js **16.2.1** App Router, React 19, Tailwind v4,
   12   Turbopack. `params` is a `Promise` and must be `await`ed in route handlers
   13   / dynamic pages. `useSearchParams` must be wrapped in `<Suspense>`. Route
   14   protection lives in **`proxy.ts`** (Next 16 convention) — there is no
   15   `middleware.ts`.
   16 - **Auth / DB:** Supabase (`@supabase/ssr` in `proxy.ts`, anon client in
   17   `lib/supabase.ts`, service-role in `lib/supabase/admin.ts`). Bearer-token
   18   pattern for API routes via `lib/api-auth.ts`:
   19   `authenticateRequest(req)` returns `{ ok, userId, token } | { ok: false,
   20   status, message }`. Role gating helpers: `requireAdmin(userId)` (in
   21   `lib/api-auth.ts`); `requireTeacher` is duplicated inline across teacher
   22   route handlers — do not refactor that in this pass.
   23 - **AI:** `@google/generative-ai` (`lib/gemini.ts`). Existing flow:
   24   `analyse` extracts question metadata from a PDF; `mark` scores a single
   25   text answer per question; `hint` returns a Socratic hint. Model fallback
   26   list in `lib/gemini.ts`.
   27 - **Schema baseline:** `profiles`, `past_papers`, `questions`, `attempts`,
   28   plus the teacher classroom tables and `subjects` / `teacher_subjects`
   29   from `supabase/schema-teacher.sql`, plus admin tables from
   30   `supabase/schema-admin.sql`. RLS on every classroom table.
   31 - **Design tokens** (in `app/globals.css`, do not rename): `bg`, `surface`,
   32   `surface-alt`, `text`, `text-muted`, `text-on-accent`, `border`,
   33   `border-strong`, `accent` (garnet `#7B1E23`), `accent-hover`,
   34   `accent-soft`, `success`, `warning`, `danger`. Fonts: `font-serif` =
   35   Fraunces (headings), `font-sans` = Inter (body). Icons:
   36   **`lucide-react`** only — never emojis. No raw hex in JSX.
   37 - **Shell:** every authed page wraps in `<AppShell>` (Sidebar + Navbar +
   38   children + Footer).
   39 - **`AnswerForm.tsx`** is the only place a student submits an answer. It
   40   posts to `/api/mark`, then renders score / feedback / strengths /
   41   improvements / model answer.
   42
   43 ## Lock lift (this task only)
   44
   45 `AGENTS.md` and `docs/CURSOR_FINISH_PROMPT.md` declare the AI pipeline
   46 locked. **For this feature only**, the following files are unlocked and
   47 may be modified:
   48
   49 - `app/api/analyse/route.ts`
   50 - `app/api/mark/route.ts`
   51 - `lib/gemini.ts`
   52 - `components/AnswerForm.tsx`
   53 - `app/papers/[id]/page.tsx`
   54 - `types/database.ts`
   55
   56 The following stay locked and must not be modified in this pass:
   57
   58 - `app/api/hint/route.ts`
   59 - The hint button + hint UI inside `AnswerForm.tsx` (changes around it
   60   are fine; do not regress the hint flow)
   61
   62 ## Non-negotiable rules
   63
   64 1. **Auth on every new endpoint.** `authenticateRequest` first, then any
   65    role check, then the query. Reject early.
   66 2. **Idempotent SQL.** `create … if not exists`, `drop policy if exists`
   67    before `create policy`. Order: tables → indexes → enable RLS →
   68    policies. Same conventions as `supabase/schema-teacher.sql`.
   69 3. **RLS on every new table or storage bucket.** Inserts that need to
   70    bypass RLS use the service-role client in API routes; never widen RLS
   71    to the public.
   72 4. **Tokens, not hex.** Use Tailwind classes that resolve to design
   73    tokens (`bg-accent`, `text-text-muted`, etc.). No raw hex in JSX.
   74 5. **Do not edit JSON files directly.** If you need a new dependency,
   75    run `pnpm add <pkg>` from the terminal — do not hand-edit
   76    `package.json`.
   77 6. **No new client-side libraries** beyond what's required for image
   78    preview + upload. No drawing libraries, no canvas frameworks.
   79 7. **Verification gate.** `pnpm run build` and
   80    `pnpm exec eslint . --max-warnings 0` must stay green after each
   81    track. Never disable type-checking.
   82 8. **Do not break existing flows.** Text-only answers still work end to
   83    end; the hint flow still works; existing analyses and attempts still
   84    render.
   85
   86 ## Out of scope (do not build)
   87
   88 - Browser drawing canvas / paint editor.
   89 - Hotspot or label-on-image annotation tooling.
   90 - Per-question-type UI branching (graph plotting vs math vs diagram all
   91   flow through the same upload control).
   92 - Multi-part question (1a / 1b / 1c) structural changes to the schema.
   93 - Image bounding-box / cropping. Render the **whole page** that contains
   94   a diagram and store that PNG; do not try to crop the figure.
   95 - Tests, CI, or new admin actions for moderating images.
   96 - Migrating off `@google/generative-ai` or changing the model fallback
   97   list.
   98
   99 If a question requires drawing or working that doesn't fit a textarea,
  100 the student takes a photo of pen-and-paper work and uploads it. That is
  101 the entire UX.
  102
  103 ---
  104
  105 ## Track 1 — Schema + Storage
  106
  107 ### 1.1 SQL: `supabase/schema-images.sql` (new file)
  108
  109 ```sql
  110 -- StudyAI — image support
  111 -- Adds question diagram URLs and answer image URLs.
  112 -- Safe to re-run.
  113
  114 -- 1. questions: optional diagram image
  115 alter table public.questions
  116   add column if not exists image_url text,
  117   add column if not exists image_path text,
  118   add column if not exists has_diagram boolean not null default false;
  119
  120 create index if not exists questions_has_diagram_idx
  121   on public.questions(has_diagram) where has_diagram = true;
  122
  123 -- 2. attempts: optional answer image (handwritten working, drawn diagram,
  124 --    graph paper, etc.)
  125 alter table public.attempts
  126   add column if not exists answer_image_url text,
  127   add column if not exists answer_image_path text;
  128
  129 -- No RLS changes here — questions and attempts already have policies.
  130 ```
  131
  132 Append a comment block at the bottom showing the two storage buckets
  133 that must be created in the Supabase dashboard (Storage → New bucket):
  134
  135 ```
  136 -- Buckets to create in Supabase Storage:
  137 --   1. question-images   public:  true   (read by anyone, write via service-role only)
  138 --   2. answer-images     public:  false  (read/write only to the owning student;
  139 --                                         server fetches via service-role for marking)
  140 ```
  141
  142 ### 1.2 Storage policies (Supabase SQL editor, after buckets exist)
  143
  144 Add a second SQL file `supabase/schema-images-storage.sql`:
  145
  146 ```sql
  147 -- question-images: reads are public via the bucket setting; restrict
  148 -- writes to service-role only by NOT defining an INSERT policy.
  149
  150 -- answer-images: students may read/write objects under their own uid
  151 -- prefix. Path convention: '<uid>/<attempt-or-uuid>.<ext>'.
  152
  153 drop policy if exists "answer_images_owner_select" on storage.objects;
  154 create policy "answer_images_owner_select"
  155   on storage.objects for select
  156   using (
  157     bucket_id = 'answer-images'
  158     and (storage.foldername(name))[1] = auth.uid()::text
  159   );
  160
  161 drop policy if exists "answer_images_owner_insert" on storage.objects;
  162 create policy "answer_images_owner_insert"
  163   on storage.objects for insert
  164   with check (
  165     bucket_id = 'answer-images'
  166     and (storage.foldername(name))[1] = auth.uid()::text
  167   );
  168
  169 drop policy if exists "answer_images_owner_update" on storage.objects;
  170 create policy "answer_images_owner_update"
  171   on storage.objects for update
  172   using (
  173     bucket_id = 'answer-images'
  174     and (storage.foldername(name))[1] = auth.uid()::text
  175   );
  176
  177 drop policy if exists "answer_images_owner_delete" on storage.objects;
  178 create policy "answer_images_owner_delete"
  179   on storage.objects for delete
  180   using (
  181     bucket_id = 'answer-images'
  182     and (storage.foldername(name))[1] = auth.uid()::text
  183   );
  184 ```
  185
  186 Teachers and admins read student answer images via API routes using
  187 `supabaseAdmin` (service-role); no extra policies needed for them.
  188
  189 ### 1.3 `types/database.ts` updates
  190
  191 Extend the existing `Question` and `Attempt` interfaces:
  192
  193 ```ts
  194 export interface Question {
  195   // …existing fields…
  196   image_url: string | null;
  197   image_path: string | null;
  198   has_diagram: boolean;
  199 }
  200
  201 export interface Attempt {
  202   // …existing fields…
  203   answer_image_url: string | null;
  204   answer_image_path: string | null;
  205 }
  206 ```
  207
  208 ---
  209
  210 ## Track 2 — Question images (display only)
  211
  212 Goal: when a paper has a diagram on a question (e.g. a heart cross-section,
  213 a circuit, a graph to read off), the student sees that image inline above
  214 the question text. We never crop the figure — we render the **whole page**
  215 that contains the question to a PNG and store it.
  216
  217 ### 2.1 PDF page renderer: `lib/pdf-render.ts` (new)
  218
  219 Use `pdfjs-dist` to render a single PDF page to a PNG buffer in Node. Run
  220 `pnpm add pdfjs-dist canvas` first. Use the legacy build:
  221
  222 ```ts
  223 import "server-only";
  224 import { createCanvas } from "canvas";
  225 // pdfjs-dist legacy build is the only one that runs in Node 20 reliably.
  226 import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
  227
  228 export async function renderPdfPageToPng(
  229   pdfBytes: Uint8Array,
  230   pageNumber: number,
  231   scale = 2
  232 ): Promise<Buffer> {
  233   const loadingTask = pdfjs.getDocument({
  234     data: pdfBytes,
  235     // suppress font warnings in serverless logs
  236     verbosity: 0,
  237   });
  238   const pdf = await loadingTask.promise;
  239   const page = await pdf.getPage(pageNumber);
  240
  241   const viewport = page.getViewport({ scale });
  242   const canvas = createCanvas(viewport.width, viewport.height);
  243   const context = canvas.getContext("2d");
  244
  245   await page.render({
  246     canvasContext: context as unknown as CanvasRenderingContext2D,
  247     viewport,
  248   }).promise;
  249
  250   return canvas.toBuffer("image/png");
  251 }
  252 ```
  253
  254 If `canvas` (the npm package) fails to install on Windows, fall back to
  255 `@napi-rs/canvas` (drop-in compatible). Note this in `NEXT_STEPS.md` if
  256 you switch.
  257
  258 ### 2.2 `lib/gemini.ts` — extend the analyse prompt
  259
  260 The existing `analyse` Gemini call returns question structure as JSON.
  261 Extend the schema it asks for:
  262
  263 ```jsonc
  264 {
  265   "questions": [
  266     {
  267       "question_number": "1a",
  268       "question_text": "…",
  269       "topic": "…",
  270       "marks_available": 3,
  271       "difficulty": "easy",
  272       "marking_scheme": "…",
  273       // NEW:
  274       "has_diagram": true,
  275       "diagram_page": 4
  276     }
  277   ]
  278 }
  279 ```
  280
  281 `has_diagram` is `true` when the question references or depends on a
  282 visual element on the page (figure, graph, circuit, table of values,
  283 photo). `diagram_page` is the 1-indexed PDF page number that contains
  284 that visual. If the question is text-only, `has_diagram` is `false` and
  285 `diagram_page` is omitted.
  286
  287 Update the prompt in `lib/gemini.ts` accordingly. Keep the existing JSON
  288 schema parser tolerant — older PDFs will not have these fields and that
  289 must not break the flow.
  290
  291 ### 2.3 `app/api/analyse/route.ts` — extract + upload page images
  292
  293 After Gemini returns the question structure, before inserting questions:
  294
  295 1. Collect the unique set of `diagram_page` values across questions.
  296 2. For each unique page, call `renderPdfPageToPng(pdfBytes, page)`.
  297 3. Upload the buffer to the `question-images` bucket via `supabaseAdmin`:
  298    - Path: `${paperId}/page-${page}.png`
  299    - `contentType: 'image/png'`, `upsert: true`.
  300 4. Build a public URL with
  301    `supabaseAdmin.storage.from('question-images').getPublicUrl(path)`.
  302 5. When inserting question rows, set `image_url`, `image_path`, and
  303    `has_diagram` from the per-question values.
  304
  305 Failures to render or upload must not fail the whole analyse — log a
  306 warning and insert the question with `has_diagram = false` and null
  307 URLs. The text-only flow must continue to work.
  308
  309 ### 2.4 Display in `app/papers/[id]/page.tsx`
  310
  311 Where each question is rendered (the existing question card):
  312
  313 - If `question.image_url` is set, render a `<figure>` block above the
  314   question text:
  315   - `<img src={question.image_url} alt={`Diagram for question ${question_number}`}
  316     className="max-h-96 w-full rounded-lg border border-border bg-surface object-contain" />`
  317   - `<figcaption className="text-xs text-text-muted mt-1">From the
  318     original paper</figcaption>`
  319 - Lazy-load: `loading="lazy"`.
  320 - If the URL fails to load, fall back silently (no broken-image icon —
  321   swap to a `text-text-muted` notice "Diagram unavailable").
  322
  323 Do **not** touch the answer form's hint button or scoring UI in this
  324 track.
  325
  326 ---
  327
  328 ## Track 3 — Answer image upload (universal)
  329
  330 Goal: a student can attach one image to any answer. The image goes to
  331 Gemini alongside the text in the marking call. This single feature
  332 covers handwritten math, graph paper, hand-drawn diagrams, working out,
  333 tables, derivations.
  334
  335 ### 3.1 `components/AnswerForm.tsx` changes
  336
  337 Add an "Attach a photo of your working (optional)" control beneath the
  338 textarea, beside the existing submit button. Spec:
  339
  340 - `<input type="file" accept="image/*" capture="environment" />` —
  341   `capture="environment"` triggers the back camera on phones.
  342 - Show a thumbnail preview after selection (use `URL.createObjectURL`).
  343 - A small "Remove" link clears the selection.
  344 - Limit file size client-side: reject anything > 8 MB with an inline
  345   error.
  346 - On submit, when an image is selected:
  347   1. Upload it to Supabase Storage from the client using the user's
  348      anon-key session:
  349      - Bucket: `answer-images`
  350      - Path: `${userId}/${crypto.randomUUID()}.${ext}` where `ext` is
  351        derived from the file's mime type (jpg/jpeg/png/webp).
  352   2. After successful upload, get the **public** path string (we'll
  353      build a signed URL server-side at marking time, or use a public
  354      URL if the bucket policy allows the student to read their own
  355      objects).
  356   3. POST to `/api/mark` with `{ questionId, answerText,
  357      answerImagePath }`. `answerImagePath` is the storage object path,
  358      not a URL. Server resolves it.
  359
  360 Visual treatment:
  361
  362 - Container: `flex flex-col gap-2` between the textarea, attach control,
  363   preview, and submit row.
  364 - Use lucide icons: `Paperclip` for the attach affordance, `X` for
  365   remove.
  366 - Preview thumbnail: `h-32 w-auto rounded-md border border-border
  367   object-contain bg-surface`.
  368 - All copy uses design tokens.
  369
  370 Edge cases:
  371
  372 - `answerText` may be empty if the student submits image-only. Allow
  373   this. Client-side validation: require at least one of text or image.
  374 - If upload fails, show a `text-danger` message and do not call `/api/
  375   mark`.
  376 - Do not modify the hint button behaviour or its wiring.
  377
  378 ### 3.2 `lib/gemini.ts` — multimodal mark
  379
  380 The existing `markAnswer` (or equivalent) function takes a text answer
  381 and returns a JSON marking result. Extend it:
  382
  383 ```ts
  384 type MarkInput = {
  385   questionText: string;
  386   markingScheme: string | null;
  387   marksAvailable: number;
  388   answerText: string;
  389   answerImage?: { mimeType: string; base64: string } | null;
  390 };
  391
  392 export async function markAnswer(input: MarkInput) {
  393   const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
  394     { text: buildMarkPrompt(input) },
  395   ];
  396   if (input.answerImage) {
  397     parts.push({
  398       inlineData: {
  399         mimeType: input.answerImage.mimeType,
  400         data: input.answerImage.base64,
  401       },
  402     });
  403   }
  404   const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  405   // …existing JSON-extraction + validation code…
  406 }
  407 ```
  408
  409 Update the prompt in `buildMarkPrompt` to acknowledge the optional
  410 image:
  411
  412 > The student's answer may include both written text and a photograph
  413 > of their working (handwriting, a diagram, a graph plotted on paper,
  414 > or a hand-drawn figure). Mark the *combined* answer. If a feature is
  415 > only legible in the image, mark from the image. If the text and image
  416 > contradict, prefer the more recent / more complete representation
  417 > noted in the image. Penalise illegibility only if the legible portion
  418 > is itself wrong.
  419
  420 Keep the JSON output schema unchanged: score, max_score, feedback,
  421 strengths, improvements, model_answer.
  422
  423 ### 3.3 `app/api/mark/route.ts` changes
  424
  425 The route currently accepts `{ questionId, answerText }`. Extend it:
  426
  427 1. Accept `answerImagePath` (string, optional) on the request body.
  428 2. After auth, if `answerImagePath` is set:
  429    - Verify the path's first segment equals `auth.userId` — reject 403
  430      otherwise (a student cannot mark someone else's image).
  431    - Use `supabaseAdmin.storage.from('answer-images').download(path)` to
  432      fetch the bytes.
  433    - Convert to base64 and pass as `answerImage` into `markAnswer`.
  434 3. After Gemini returns, when inserting the `attempts` row, set
  435    `answer_image_path` and `answer_image_url`. The URL is built from
  436    the path using `getPublicUrl` if you need a stored URL (the client
  437    never reads it directly except via the API), otherwise leave
  438    `answer_image_url` null and just keep the path.
  439
  440 Cap image size server-side at **8 MB** before sending to Gemini; reject
  441 413 above that. Cap mime type to `image/jpeg`, `image/png`, `image/webp`
  442 — reject 415 otherwise.
  443
  444 If Gemini fails on the multimodal call (rate limit, malformed image,
  445 model fallback exhaustion), surface a clean error to the client; do
  446 **not** fall back silently to text-only marking. Log the error.
  447
  448 ### 3.4 Persist + display the answer image
  449
  450 When viewing a past attempt (existing UI in `app/papers/[id]/page.tsx`
  451 or wherever the attempt detail renders), if `attempt.answer_image_url`
  452 is set, render it under "Your answer" with the same styling as the
  453 question diagram.
  454
  455 ---
  456
  457 ## Track 4 — Acceptance criteria
  458
  459 Run through this checklist with a real Supabase project + a real Gemini
  460 API key. Take screenshots — they go into the report.
  461
  462 ### Schema + storage
  463 - [ ] `pnpm run build` green; ESLint zero warnings.
  464 - [ ] Both SQL files apply cleanly to a fresh database, and re-apply
  465       without error.
  466 - [ ] Both buckets exist with the correct public/private setting.
  467 - [ ] Storage policies allow a logged-in user to upload to
  468       `answer-images/<their-uid>/foo.png` and reject uploads to a
  469       different uid prefix.
  470
  471 ### Question images
  472 - [ ] Uploading a paper PDF that contains at least one figure produces
  473       questions with `has_diagram = true` and a populated `image_url`.
  474 - [ ] Uploading a text-only paper still works; questions have
  475       `has_diagram = false` and null URLs; nothing in the UI breaks.
  476 - [ ] On the paper view, questions with diagrams render the image above
  477       the question text. Image is responsive, has alt text, and lazy
  478       loads.
  479
  480 ### Answer image upload
  481 - [ ] A student can submit text-only (existing flow unchanged).
  482 - [ ] A student can submit image-only (no text). The mark API succeeds.
  483 - [ ] A student can submit text + image. Gemini's feedback acknowledges
  484       both.
  485 - [ ] Files > 8 MB are rejected client-side with a clear message.
  486 - [ ] Non-image files are rejected.
  487 - [ ] Submitting image-only without text shows score / feedback /
  488       strengths / improvements / model answer in the existing result UI.
  489 - [ ] The hint button still works on every question.
  490 - [ ] An attempt row stores the image path; revisiting the page shows
  491       the image alongside the answer text.
  492
  493 ### Negative paths
  494 - [ ] Marking with an `answerImagePath` that doesn't belong to the
  495       caller returns 403.
  496 - [ ] If Gemini fails, the user sees a friendly error, the attempt
  497       is **not** inserted, and no XP is awarded.
  498 - [ ] If storage upload fails on the client, no `/api/mark` request is
  499       sent.
  500
  501 ### Build + lint
  502 - [ ] `pnpm run build` green at the end.
  503 - [ ] `pnpm exec eslint . --max-warnings 0` clean.
  504 - [ ] No new dependency added by editing `package.json` directly — only
  505       via `pnpm add`.
  506
  507 ---
  508
  509 ## Verification commands
  510
  511 ```bash
  512 # from the project root
  511 ```bash
  512 # from the project root
  513 pnpm install
  514 pnpm add pdfjs-dist canvas
  515 pnpm run build
  516 pnpm exec eslint . --max-warnings 0
  517 pnpm dev
  518 ```
  519
  520 Then in Supabase SQL editor (in this order):
  521 1. `supabase/schema-images.sql`
  522 2. Create `question-images` (public) and `answer-images` (private) buckets in the dashboard.
  523 3. `supabase/schema-images-storage.sql`
  524
  525 ---
  526
  527 ## Deliverables (in this exact order)
  528
  529 1. Run `pnpm run build` to confirm a green baseline.
  530 2. Track 1 schema + storage files; apply them.
  531 3. Track 2 page-render util + analyse changes + display.
  532 4. Track 3 AnswerForm + mark route + Gemini multimodal.
  533 5. Track 4 walkthrough — fix anything that fails.
  534 6. Final `pnpm run build` + a 6–10 line summary at the bottom of
  535    `NEXT_STEPS.md` describing what shipped, the SQL to apply, and any
  536    known follow-ups (especially: how the image flow handles slow Gemini
  537    responses, and any bucket setup nuance).
  538
  539 Do **not** commit. Leave the diff clean for the user to review.