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
