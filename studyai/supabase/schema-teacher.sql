-- StudyAI — Teacher / Classroom schema
-- Run this in Supabase SQL editor before using /teacher/* routes.
-- Includes subjects + classes.subject_id (§2b). Safe to re-run: all DDL uses
-- IF NOT EXISTS / DROP IF EXISTS / DROP POLICY IF EXISTS.
--
-- Order:
--   1. profiles.role column
--   2. All tables + indexes (no cross-table policies yet)
--   3. Enable RLS on all tables
--   4. All policies (tables now exist, so cross-references resolve)

-- ===========================================================================
-- 1. profiles.role
-- ===========================================================================

alter table public.profiles
  add column if not exists role text not null default 'student';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher'));

-- ===========================================================================
-- 2. Tables + indexes
-- ===========================================================================

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists classes_teacher_id_idx on public.classes(teacher_id);
create index if not exists classes_join_code_idx on public.classes(join_code);

create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists class_members_class_id_idx on public.class_members(class_id);
create index if not exists class_members_student_id_idx on public.class_members(student_id);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  paper_id uuid not null references public.past_papers(id) on delete cascade,
  title text not null,
  instructions text,
  due_date timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists assignments_class_id_idx on public.assignments(class_id);
create index if not exists assignments_paper_id_idx on public.assignments(paper_id);

create table if not exists public.class_invites (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint class_invites_status_check check (status in ('pending', 'accepted', 'declined')),
  unique (class_id, student_id)
);

create index if not exists class_invites_class_id_idx on public.class_invites(class_id);
create index if not exists class_invites_student_id_idx on public.class_invites(student_id);
create index if not exists class_invites_status_idx on public.class_invites(status);

-- ===========================================================================
-- 2b. Subjects + teacher_subjects + classes.subject_id
-- (Teacher UI and /api/teacher/* expect classes.subject_id — same as
--  schema-teacher-subjects.sql; kept inline so one paste is enough.)
-- ===========================================================================

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

-- ===========================================================================
-- 3. Enable RLS
-- ===========================================================================

alter table public.classes        enable row level security;
alter table public.class_members  enable row level security;
alter table public.assignments    enable row level security;
alter table public.class_invites  enable row level security;
alter table public.subjects       enable row level security;
alter table public.teacher_subjects enable row level security;

-- ===========================================================================
-- 4. Policies — classes
-- ===========================================================================

drop policy if exists "classes_teacher_all" on public.classes;
create policy "classes_teacher_all"
  on public.classes
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "classes_member_select" on public.classes;
create policy "classes_member_select"
  on public.classes
  for select
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = classes.id
        and cm.student_id = auth.uid()
    )
  );

-- ===========================================================================
-- 4b. Policies — class_members
-- ===========================================================================

drop policy if exists "class_members_student_select" on public.class_members;
create policy "class_members_student_select"
  on public.class_members
  for select
  using (student_id = auth.uid());

drop policy if exists "class_members_teacher_select" on public.class_members;
create policy "class_members_teacher_select"
  on public.class_members
  for select
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "class_members_student_insert" on public.class_members;
create policy "class_members_student_insert"
  on public.class_members
  for insert
  with check (student_id = auth.uid());

drop policy if exists "class_members_teacher_delete" on public.class_members;
create policy "class_members_teacher_delete"
  on public.class_members
  for delete
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_members.class_id
        and c.teacher_id = auth.uid()
    )
  );

-- ===========================================================================
-- 4c. Policies — assignments
-- ===========================================================================

drop policy if exists "assignments_teacher_all" on public.assignments;
create policy "assignments_teacher_all"
  on public.assignments
  for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = assignments.class_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = assignments.class_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "assignments_member_select" on public.assignments;
create policy "assignments_member_select"
  on public.assignments
  for select
  using (
    exists (
      select 1 from public.class_members cm
      where cm.class_id = assignments.class_id
        and cm.student_id = auth.uid()
    )
  );

-- ===========================================================================
-- 4d. Policies — class_invites
-- ===========================================================================

drop policy if exists "class_invites_teacher_all" on public.class_invites;
create policy "class_invites_teacher_all"
  on public.class_invites
  for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = class_invites.class_id
        and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = class_invites.class_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "class_invites_student_select" on public.class_invites;
create policy "class_invites_student_select"
  on public.class_invites
  for select
  using (student_id = auth.uid());

drop policy if exists "class_invites_student_update" on public.class_invites;
create policy "class_invites_student_update"
  on public.class_invites
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ===========================================================================
-- 4e. Policies — subjects + teacher_subjects
-- ===========================================================================

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
