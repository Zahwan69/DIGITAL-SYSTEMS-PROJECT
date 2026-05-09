-- Patch: add chat modes to teacher_chats
-- Modes:
--   class-analytics   (default) — existing behaviour, class snapshot only
--   paper-review      — picks a past_papers row; Gemini reviews the questions
--   write-questions   — picks a subject + optional uploaded syllabus PDF text;
--                       Gemini drafts new questions

alter table public.teacher_chats
  add column if not exists mode text not null default 'class-analytics'
    check (mode in ('class-analytics','paper-review','write-questions')),
  add column if not exists paper_id uuid references public.past_papers(id) on delete set null,
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists syllabus_text text,
  add column if not exists syllabus_filename text;

create index if not exists teacher_chats_mode_idx
  on public.teacher_chats(mode);
