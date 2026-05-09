-- Add/repair profile progress columns used by XP and level displays.
-- Safe to run multiple times in Supabase SQL Editor.

alter table public.profiles
  add column if not exists xp integer,
  add column if not exists level integer,
  add column if not exists study_streak integer,
  add column if not exists last_study_date date;

alter table public.profiles
  alter column xp set default 0,
  alter column level set default 1,
  alter column study_streak set default 0;

update public.profiles
set
  xp = coalesce(xp, 0),
  level = coalesce(level, greatest(1, (coalesce(xp, 0) / 500) + 1)),
  study_streak = coalesce(study_streak, 0);

alter table public.profiles
  alter column xp set not null,
  alter column level set not null,
  alter column study_streak set not null;
