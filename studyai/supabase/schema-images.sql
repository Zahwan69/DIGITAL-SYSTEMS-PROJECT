-- StudyAI - image support
-- Adds question diagram URLs and answer image URLs.
-- Safe to re-run.

-- 1. questions: optional diagram image
alter table public.questions
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists has_diagram boolean not null default false;

create index if not exists questions_has_diagram_idx
  on public.questions(has_diagram) where has_diagram = true;

-- 2. attempts: optional answer image (handwritten working, drawn diagram,
--    graph paper, etc.)
alter table public.attempts
  add column if not exists answer_image_url text,
  add column if not exists answer_image_path text,
  add column if not exists needs_teacher_review boolean not null default false;

create index if not exists attempts_needs_teacher_review_idx
  on public.attempts(needs_teacher_review) where needs_teacher_review = true;

-- No RLS changes here - questions and attempts already have policies.

-- Buckets to create in Supabase Storage:
--   1. question-images   public:  true   (read by anyone, write via service-role only)
--   2. answer-images     public:  false  (read/write only to the owning student;
--                                         server fetches via service-role for marking)
