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
-- 7. STUDENT HELPER USAGE (tracks per-student answer reveals)
-- =============================================================================

create table if not exists public.question_help_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_revealed boolean not null default false,
  answer_revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, question_id)
);

create index if not exists question_help_usage_user_idx
  on public.question_help_usage(user_id);

alter table public.question_help_usage enable row level security;

drop policy if exists "own help usage" on public.question_help_usage;
create policy "own help usage" on public.question_help_usage
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- =============================================================================
-- 8. STORAGE POLICIES (only if you've created the answer-images bucket)
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
-- 9. ROLES & PERMISSIONS (Phase 1 — Foundation)
-- =============================================================================
-- Adds: superadmin, administration, tutor roles alongside existing student/
-- teacher/admin. Legacy 'admin' is intentionally KEPT valid in the CHECK so
-- existing rows don't violate the constraint; application code treats 'admin'
-- as an alias of 'superadmin'. We will run a one-shot
--   update public.profiles set role = 'superadmin' where role = 'admin';
-- later in Phase 5, after smoke testing the new UI.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student','teacher','tutor','administration','superadmin','admin'));

-- Distinguish school classes from tutor tuition groups. UI labels differ by
-- role; the underlying table is shared.
alter table public.classes
  add column if not exists group_type text not null default 'school_class';
alter table public.classes drop constraint if exists classes_group_type_check;
alter table public.classes
  add constraint classes_group_type_check
  check (group_type in ('school_class','tuition_group'));
create index if not exists classes_group_type_idx on public.classes(group_type);

-- Audit who instantiated a class (administration vs teacher). Backfill
-- existing rows so the column is never null on old data.
alter table public.classes
  add column if not exists created_by uuid references auth.users(id) on delete set null;
update public.classes set created_by = teacher_id where created_by is null;

-- Permission catalogue + role default bundle + per-user extra grants.
create table if not exists public.permissions (
  key text primary key,
  description text not null
);

create table if not exists public.role_default_permissions (
  role text not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

create table if not exists public.user_extra_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index if not exists user_extra_permissions_user_idx
  on public.user_extra_permissions(user_id);

alter table public.permissions enable row level security;
alter table public.role_default_permissions enable row level security;
alter table public.user_extra_permissions enable row level security;

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select using (true);

drop policy if exists role_default_permissions_read on public.role_default_permissions;
create policy role_default_permissions_read on public.role_default_permissions for select using (true);

drop policy if exists user_extra_permissions_owner on public.user_extra_permissions;
create policy user_extra_permissions_owner on public.user_extra_permissions
  for select using (user_id = auth.uid());

-- Audit log: legacy policy was hard-coded to role='admin'. Widen so newly
-- assigned 'superadmin' users keep audit visibility.
drop policy if exists admin_audit_select on public.admin_audit_log;
create policy admin_audit_select on public.admin_audit_log
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','superadmin')
    )
  );

-- Seed permission keys (idempotent).
insert into public.permissions (key, description) values
  ('users.view', 'View user list'),
  ('users.create_student', 'Create student accounts'),
  ('users.create_teacher', 'Create teacher accounts'),
  ('users.create_tutor', 'Create tutor accounts'),
  ('users.create_administration', 'Create administration accounts'),
  ('users.update', 'Update user profiles'),
  ('users.disable', 'Disable or re-enable users'),
  ('users.reset_password', 'Trigger user password reset'),
  ('users.assign_role', 'Change a user role'),
  ('users.assign_permissions', 'Grant or revoke extra permissions'),
  ('classes.view', 'View school classes'),
  ('classes.create', 'Create school classes'),
  ('classes.update', 'Update school classes'),
  ('classes.delete', 'Delete school classes'),
  ('classes.assign_teacher', 'Reassign a teacher to a class'),
  ('classes.add_student', 'Add a student to a class'),
  ('classes.remove_student', 'Remove a student from a class'),
  ('classes.view_members', 'View class roster'),
  ('tuition_groups.view', 'View tuition groups'),
  ('tuition_groups.create', 'Create tuition groups'),
  ('tuition_groups.update', 'Update tuition groups'),
  ('tuition_groups.delete', 'Delete tuition groups'),
  ('tuition_groups.add_student', 'Add a student to a tuition group'),
  ('tuition_groups.remove_student', 'Remove a student from a tuition group'),
  ('assignments.view', 'View assignments'),
  ('assignments.create', 'Create assignments'),
  ('assignments.update', 'Update assignments'),
  ('assignments.delete', 'Delete assignments'),
  ('assignments.view_submissions', 'View student submissions'),
  ('documents.upload', 'Upload teaching documents'),
  ('documents.view', 'View teaching documents'),
  ('documents.update', 'Update documents'),
  ('documents.delete', 'Delete documents'),
  ('documents.analyse', 'Run AI analysis on documents'),
  ('ai.teacher_chat', 'Use the teacher assistant'),
  ('ai.generate_questions', 'Generate practice questions'),
  ('ai.generate_worksheets', 'Generate worksheets'),
  ('ai.review_paper', 'AI paper review'),
  ('ai.class_analytics', 'AI class analytics summaries'),
  ('analytics.view_own', 'See own analytics'),
  ('analytics.view_class', 'See class analytics'),
  ('analytics.view_group', 'See tuition group analytics'),
  ('analytics.view_school', 'See school-wide analytics')
on conflict (key) do nothing;

-- Seed default role bundles. Idempotent via pk conflict-do-nothing.
-- IMPORTANT: per Phase-1 spec, teachers do NOT receive classes.create,
-- classes.add_student, classes.remove_student, or classes.assign_teacher by
-- default. Those become user_extra_permissions grants from administration.

-- Superadmin: every permission key.
insert into public.role_default_permissions (role, permission_key)
  select 'superadmin', key from public.permissions
on conflict do nothing;

-- Administration bundle.
insert into public.role_default_permissions (role, permission_key) values
  ('administration', 'users.view'),
  ('administration', 'users.create_student'),
  ('administration', 'users.create_teacher'),
  ('administration', 'users.create_tutor'),
  ('administration', 'users.update'),
  ('administration', 'users.disable'),
  ('administration', 'users.reset_password'),
  ('administration', 'users.assign_permissions'),
  ('administration', 'classes.view'),
  ('administration', 'classes.create'),
  ('administration', 'classes.update'),
  ('administration', 'classes.delete'),
  ('administration', 'classes.assign_teacher'),
  ('administration', 'classes.add_student'),
  ('administration', 'classes.remove_student'),
  ('administration', 'classes.view_members'),
  ('administration', 'assignments.view'),
  ('administration', 'assignments.create'),
  ('administration', 'assignments.update'),
  ('administration', 'assignments.delete'),
  ('administration', 'assignments.view_submissions'),
  ('administration', 'documents.view'),
  ('administration', 'analytics.view_class'),
  ('administration', 'analytics.view_school')
on conflict do nothing;

-- Teacher bundle — explicitly excludes classes.create / add_student /
-- remove_student / assign_teacher. Those are extras from administration.
insert into public.role_default_permissions (role, permission_key) values
  ('teacher', 'classes.view'),
  ('teacher', 'classes.view_members'),
  ('teacher', 'assignments.view'),
  ('teacher', 'assignments.create'),
  ('teacher', 'assignments.update'),
  ('teacher', 'assignments.delete'),
  ('teacher', 'assignments.view_submissions'),
  ('teacher', 'documents.upload'),
  ('teacher', 'documents.view'),
  ('teacher', 'documents.analyse'),
  ('teacher', 'ai.teacher_chat'),
  ('teacher', 'ai.generate_questions'),
  ('teacher', 'ai.generate_worksheets'),
  ('teacher', 'ai.review_paper'),
  ('teacher', 'ai.class_analytics'),
  ('teacher', 'analytics.view_class')
on conflict do nothing;

-- Tutor bundle — full tuition group scope; never touches school classes.
insert into public.role_default_permissions (role, permission_key) values
  ('tutor', 'tuition_groups.view'),
  ('tutor', 'tuition_groups.create'),
  ('tutor', 'tuition_groups.update'),
  ('tutor', 'tuition_groups.delete'),
  ('tutor', 'tuition_groups.add_student'),
  ('tutor', 'tuition_groups.remove_student'),
  ('tutor', 'assignments.view'),
  ('tutor', 'assignments.create'),
  ('tutor', 'assignments.update'),
  ('tutor', 'assignments.delete'),
  ('tutor', 'assignments.view_submissions'),
  ('tutor', 'documents.upload'),
  ('tutor', 'documents.view'),
  ('tutor', 'documents.analyse'),
  ('tutor', 'ai.teacher_chat'),
  ('tutor', 'ai.generate_questions'),
  ('tutor', 'ai.generate_worksheets'),
  ('tutor', 'ai.review_paper'),
  ('tutor', 'analytics.view_group')
on conflict do nothing;

-- Student bundle.
insert into public.role_default_permissions (role, permission_key) values
  ('student', 'assignments.view'),
  ('student', 'documents.view'),
  ('student', 'analytics.view_own')
on conflict do nothing;


-- =============================================================================
-- DONE. Reload PostgREST schema cache so the API sees new columns immediately.
-- =============================================================================
notify pgrst, 'reload schema';
