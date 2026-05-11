-- =============================================================================
-- StudyAI — full schema migration (one-paste, idempotent)
-- =============================================================================
-- Paste the entire file into Supabase SQL Editor and Run. Safe to re-run.
-- After this, create three Storage buckets manually in the Supabase dashboard:
--   - question-images   (public)
--   - answer-images     (private)
--   - question-papers   (private)   -- original uploaded question paper PDFs
-- The storage policies for answer-images are at the bottom of this file.
-- =============================================================================


-- =============================================================================
-- 1. CORE STUDY TABLES (profiles, past_papers, questions, attempts, achievements)
-- =============================================================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  xp integer default 0 not null,
  level integer default 1 not null,
  study_streak integer default 0 not null,
  last_study_date date,
  created_at timestamptz default now() not null
);

create table if not exists public.past_papers (
  id uuid default gen_random_uuid() primary key,
  uploaded_by uuid references public.profiles(id) on delete cascade not null,
  subject_name text not null,
  syllabus_code text not null,
  year integer,
  paper_number text,
  level text not null,
  file_url text,
  question_count integer default 0,
  created_at timestamptz default now() not null
);

alter table public.past_papers
  drop constraint if exists past_papers_level_check;
alter table public.past_papers
  add constraint past_papers_level_check
  check (level in ('O-Level','A-Level','IGCSE','AS-Level'));

create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  paper_id uuid references public.past_papers(id) on delete cascade not null,
  question_number text not null,
  question_text text not null,
  topic text not null,
  marks_available integer not null,
  difficulty text not null,
  marking_scheme text,
  created_at timestamptz default now() not null
);

alter table public.questions
  drop constraint if exists questions_difficulty_check;
alter table public.questions
  add constraint questions_difficulty_check
  check (difficulty in ('easy','medium','hard'));

create table if not exists public.attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  answer_text text,
  answer_image_url text,
  score integer not null,
  max_score integer not null,
  percentage integer not null,
  feedback text not null,
  strengths text[] default '{}',
  improvements text[] default '{}',
  model_answer text not null,
  xp_earned integer default 0,
  created_at timestamptz default now() not null
);

create table if not exists public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_key text not null,
  badge_name text not null,
  badge_description text not null,
  badge_icon text not null,
  awarded_at timestamptz default now() not null,
  unique(user_id, badge_key)
);

-- Auto-create a profile when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS for core tables
alter table public.profiles      enable row level security;
alter table public.past_papers   enable row level security;
alter table public.questions     enable row level security;
alter table public.attempts      enable row level security;
alter table public.achievements  enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id);

drop policy if exists "own papers" on public.past_papers;
create policy "own papers" on public.past_papers for all using (auth.uid() = uploaded_by);

drop policy if exists "own paper questions" on public.questions;
create policy "own paper questions" on public.questions for all using (
  exists (select 1 from public.past_papers
          where past_papers.id = questions.paper_id
            and past_papers.uploaded_by = auth.uid())
);

drop policy if exists "own attempts" on public.attempts;
create policy "own attempts" on public.attempts for all using (auth.uid() = user_id);

drop policy if exists "own achievements" on public.achievements;
create policy "own achievements" on public.achievements for all using (auth.uid() = user_id);


-- =============================================================================
-- 2. IMAGE SUPPORT (questions diagrams + attempts answer images + review flag)
-- =============================================================================

alter table public.questions
  add column if not exists image_url text,
  add column if not exists image_path text,
  add column if not exists has_diagram boolean not null default false,
  add column if not exists page_start integer,
  add column if not exists page_end integer;

create index if not exists questions_has_diagram_idx
  on public.questions(has_diagram) where has_diagram = true;

alter table public.attempts
  add column if not exists answer_image_url text,
  add column if not exists answer_image_path text,
  add column if not exists needs_teacher_review boolean not null default false;

create index if not exists attempts_needs_teacher_review_idx
  on public.attempts(needs_teacher_review) where needs_teacher_review = true;


-- =============================================================================
-- 3. TEACHER / CLASSROOM (profiles.role, classes, class_members, assignments,
--    class_invites, subjects, teacher_subjects)
-- =============================================================================

alter table public.profiles
  add column if not exists role text not null default 'student';

-- Allow 'admin' too (admin schema below adds it; we set the wider check upfront
-- so this script is order-independent)
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

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

-- RLS
alter table public.classes          enable row level security;
alter table public.class_members    enable row level security;
alter table public.assignments      enable row level security;
alter table public.class_invites    enable row level security;
alter table public.subjects         enable row level security;
alter table public.teacher_subjects enable row level security;

-- classes
drop policy if exists "classes_teacher_all" on public.classes;
create policy "classes_teacher_all" on public.classes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "classes_member_select" on public.classes;
create policy "classes_member_select" on public.classes for select using (
  exists (select 1 from public.class_members cm
          where cm.class_id = classes.id and cm.student_id = auth.uid())
);

-- class_members
drop policy if exists "class_members_student_select" on public.class_members;
create policy "class_members_student_select" on public.class_members for select
  using (student_id = auth.uid());

drop policy if exists "class_members_teacher_select" on public.class_members;
create policy "class_members_teacher_select" on public.class_members for select using (
  exists (select 1 from public.classes c
          where c.id = class_members.class_id and c.teacher_id = auth.uid())
);

drop policy if exists "class_members_student_insert" on public.class_members;
create policy "class_members_student_insert" on public.class_members for insert
  with check (student_id = auth.uid());

drop policy if exists "class_members_teacher_delete" on public.class_members;
create policy "class_members_teacher_delete" on public.class_members for delete using (
  exists (select 1 from public.classes c
          where c.id = class_members.class_id and c.teacher_id = auth.uid())
);

-- assignments
drop policy if exists "assignments_teacher_all" on public.assignments;
create policy "assignments_teacher_all" on public.assignments for all
  using (
    exists (select 1 from public.classes c
            where c.id = assignments.class_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.classes c
            where c.id = assignments.class_id and c.teacher_id = auth.uid())
  );

drop policy if exists "assignments_member_select" on public.assignments;
create policy "assignments_member_select" on public.assignments for select using (
  exists (select 1 from public.class_members cm
          where cm.class_id = assignments.class_id and cm.student_id = auth.uid())
);

-- class_invites
drop policy if exists "class_invites_teacher_all" on public.class_invites;
create policy "class_invites_teacher_all" on public.class_invites for all
  using (
    exists (select 1 from public.classes c
            where c.id = class_invites.class_id and c.teacher_id = auth.uid())
  )
  with check (
    exists (select 1 from public.classes c
            where c.id = class_invites.class_id and c.teacher_id = auth.uid())
  );

drop policy if exists "class_invites_student_select" on public.class_invites;
create policy "class_invites_student_select" on public.class_invites for select
  using (student_id = auth.uid());

drop policy if exists "class_invites_student_update" on public.class_invites;
create policy "class_invites_student_update" on public.class_invites for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- subjects + teacher_subjects
drop policy if exists "subjects_select_all" on public.subjects;
create policy "subjects_select_all" on public.subjects for select using (true);

drop policy if exists "teacher_subjects_select_own" on public.teacher_subjects;
create policy "teacher_subjects_select_own" on public.teacher_subjects for select
  using (teacher_id = auth.uid());


-- =============================================================================
-- 4. ADMIN ROLE + AUDIT LOG
-- =============================================================================

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_actor_idx on public.admin_audit_log(actor_id);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_select on public.admin_audit_log;
create policy admin_audit_select on public.admin_audit_log
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );


-- =============================================================================
-- 5. TEACHER CHAT (teacher_chats + teacher_chat_messages)
-- =============================================================================

create table if not exists public.teacher_chats (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists teacher_chats_teacher_recent_idx
  on public.teacher_chats(teacher_id, last_message_at desc);

create index if not exists teacher_chats_class_idx
  on public.teacher_chats(class_id);

create table if not exists public.teacher_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.teacher_chats(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  token_count int,
  created_at timestamptz not null default now()
);

create index if not exists teacher_chat_messages_chat_time_idx
  on public.teacher_chat_messages(chat_id, created_at);

alter table public.teacher_chats enable row level security;
alter table public.teacher_chat_messages enable row level security;

drop policy if exists teacher_chats_owner on public.teacher_chats;
create policy teacher_chats_owner on public.teacher_chats
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists teacher_chat_messages_owner on public.teacher_chat_messages;
create policy teacher_chat_messages_owner on public.teacher_chat_messages
  for all using (
    exists (select 1 from public.teacher_chats c
            where c.id = chat_id and c.teacher_id = auth.uid())
  );


-- =============================================================================
-- 6. CHAT MODES PATCH (mode + paper_id + subject_id + syllabus columns)
-- =============================================================================

alter table public.teacher_chats
  add column if not exists mode text not null default 'class-analytics'
    check (mode in ('class-analytics','paper-review','write-questions')),
  add column if not exists paper_id uuid references public.past_papers(id) on delete set null,
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists syllabus_text text,
  add column if not exists syllabus_filename text;

create index if not exists teacher_chats_mode_idx
  on public.teacher_chats(mode);


-- =============================================================================
-- 7. STORAGE POLICIES (only if you've created the answer-images bucket)
-- =============================================================================
-- Buckets to create in Supabase Storage (Dashboard → Storage → New bucket):
--   - question-images   (public: TRUE — anyone reads, only service role writes)
--   - answer-images     (public: FALSE — students read/write own folder)
--   - question-papers   (public: FALSE — original QP PDFs; service role writes,
--                        readers fetch via 1-hour signed URL minted by the API)
--
-- The policies below scope answer-images writes to '<uid>/<filename>' paths.
-- question-papers reads/writes go exclusively through the service-role key on
-- the API, so no explicit RLS policy is required.
-- Skip this section if buckets don't exist yet — re-run after creating them.

drop policy if exists "answer_images_owner_select" on storage.objects;
create policy "answer_images_owner_select"
  on storage.objects for select using (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "answer_images_owner_insert" on storage.objects;
create policy "answer_images_owner_insert"
  on storage.objects for insert with check (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "answer_images_owner_update" on storage.objects;
create policy "answer_images_owner_update"
  on storage.objects for update using (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "answer_images_owner_delete" on storage.objects;
create policy "answer_images_owner_delete"
  on storage.objects for delete using (
    bucket_id = 'answer-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- =============================================================================
-- DONE. Reload PostgREST schema cache so the API sees new columns immediately.
-- =============================================================================
notify pgrst, 'reload schema';
