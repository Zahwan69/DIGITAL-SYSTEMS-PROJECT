-- StudyAI — Subjects + teacher_subjects + classes.subject_id
-- Run after schema-teacher.sql **only if** you used an older schema-teacher.sql
-- that did not yet include §2b (subjects). Current schema-teacher.sql already
-- contains this block — you can skip this file on fresh installs.
-- Safe to re-run.

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  syllabus_code text,
  level text,
  created_at timestamptz not null default now(),
  unique (name, syllabus_code)
);

create table if not exists public.teacher_subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (teacher_id, subject_id)
);

alter table public.classes
  add column if not exists subject_id uuid references public.subjects(id) on delete set null;

create index if not exists classes_subject_id_idx on public.classes(subject_id);

alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;

drop policy if exists "subjects_select_all" on public.subjects;
create policy "subjects_select_all"
  on public.subjects
  for select
  using (true);

drop policy if exists "teacher_subjects_select_own" on public.teacher_subjects;
create policy "teacher_subjects_select_own"
  on public.teacher_subjects
  for select
  using (teacher_id = auth.uid());
