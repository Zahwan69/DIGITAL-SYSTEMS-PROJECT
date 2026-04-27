-- StudyAI — Admin role + audit log
-- Run after schema-teacher.sql and schema-teacher-subjects.sql. Safe to re-run.

-- 1. Extend profiles.role
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- 2. admin_audit_log
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
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Promote a user to admin (run in SQL editor with a real UUID):
-- update public.profiles set role = 'admin' where id = '<uuid>';
