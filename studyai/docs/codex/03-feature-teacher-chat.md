# 03 — Feature: Teacher AI Chat

A "Claude-style" chat where a teacher picks a class and asks Gemini about it. Chats are persisted, scoped per teacher and per class, browsable from a sidebar.

## 1. Where it lives

- **`/teacher/dashboard`** keeps all current content **but** gains a hero card at the very top: a single composer-style block titled *"Ask AI about your class"* with a class dropdown, a textarea, and three suggested prompts as chips ("How is 9A doing this week?", "Which topics are weakest in IGCSE Maths?", "Who needs help right now?"). Clicking the textarea or any chip routes to `/teacher/chat?classId=<id>&q=<urlencoded>`.
- **`/teacher/chat`** is the dedicated chat surface. Two-pane layout:
  - Left rail (280px): "New chat" button at top, then a scrollable list of past chats grouped by class, then by date (Today / Yesterday / Earlier). Each row shows the chat title + class name + relative time.
  - Main pane: scrolling message thread + a fixed bottom composer. Class selector sits in the thread header (cannot be changed mid-chat — locked once first message is sent).
- **`/teacher/chat/[chatId]`** loads the same surface preselected on a chat.

## 2. Schema — `supabase/schema-teacher-chat.sql` (new file)

```sql
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
```

## 3. API routes (all under `app/api/teacher/chat/`)

Every handler: `authenticateRequest` → `requireTeacher` → query.

- `GET route.ts` — list chats. Query `?classId=` optional. Returns `[{ id, classId, className, title, lastMessageAt }]`, ordered by `last_message_at desc`, limit 100.
- `POST route.ts` — create chat. Body `{ classId }`. Verifies the class belongs to the teacher (via `supabaseAdmin`). Returns `{ id }`.
- `GET [chatId]/route.ts` — fetch chat metadata + all messages. Verify ownership.
- `POST [chatId]/messages/route.ts` — send a message. Body `{ content }`.
  1. Verify chat ownership.
  2. Insert the user message.
  3. Build the **class snapshot** (see §4) using `supabaseAdmin`.
  4. Build the prompt: a system message containing the snapshot + a strict policy ("Only answer using the data provided. If the snapshot does not contain the answer, say so. Do not invent student names or scores."), then the chat history (last 20 messages), then the new user message.
  5. Call `geminiFlash.generateContent` (non-streaming for v1). Wrap in try/catch with a 60s timeout — return 502 on timeout, mirroring `/api/mark`.
  6. Insert the assistant message; update `teacher_chats.last_message_at` and, if `title === 'New chat'`, set the title to the first 60 chars of the user's first message.
  7. Return `{ assistantMessage: {...} }`.
- `DELETE [chatId]/route.ts` — delete chat (cascade deletes messages).

## 4. Class snapshot (server-side helper, `lib/teacher-chat-context.ts`)

Builds a JSON object Gemini can read. Use `supabaseAdmin`. **Cap every list at 200 rows.**

```ts
type ClassSnapshot = {
  class: { id: string; name: string; subject?: { name: string; code: string; level: string } };
  generatedAt: string;
  windowDays: 30;
  roster: Array<{ studentLabel: string; xpTotal: number; xpLast30: number; lastActive: string | null }>;
  attemptsSummary: { total30d: number; avgPercentage: number; activeStudents30d: number };
  perStudent: Array<{ studentLabel: string; attempts30d: number; avgPercentage: number; topWeakTopic?: string }>;
  topicMastery: Array<{ topic: string; attempts: number; avgPercentage: number }>;
  difficultyMix: Array<{ difficulty: 'easy'|'medium'|'hard'; attempts: number; avgPercentage: number }>;
  assignments: Array<{ title: string; dueAt: string | null; assigned: number; attempted: number; completed: number }>;
  recentActivity: Array<{ studentLabel: string; assignmentOrPaper: string; percentage: number; at: string }>; // last 25
};
```

`studentLabel` = `firstName + " " + lastInitial + "."` (privacy: never send raw IDs or emails to Gemini).

The snapshot is **stringified into the system message** at every turn — it's cheap, the data set is bounded, and it keeps the model honest. Do not cache for now.

## 5. UI components

- `components/teacher/ChatSidebar.tsx` — list, grouped, with `New chat` button. Active chat highlighted with `bg-[--color-accent-soft]`.
- `components/teacher/ChatThread.tsx` — message list. User bubble: white card with hairline border. Assistant bubble: `bg-[--color-accent-soft]`. Render markdown via the markdown lib already installed (check `package.json`; if none, propose adding `react-markdown` via CLI — do not edit JSON yourself).
- `components/teacher/ChatComposer.tsx` — bottom-fixed textarea (auto-grow, max 8 rows), `Send` button (Moving Border, lucide `ArrowUp` icon), Cmd/Ctrl+Enter shortcut, disabled while a request is in flight.
- `components/teacher/ChatHeroCard.tsx` — the dashboard hero block. Class dropdown + textarea + 3 suggestion chips (Hover Border Gradient) + "Open chat" button.

## 6. Acceptance

- A teacher can click into the dashboard hero, send a question, and see Gemini answer using only data from their class.
- A second teacher logging in cannot see the first teacher's chats (verify via SQL).
- Refreshing `/teacher/chat/[chatId]` restores the full thread.
- Empty class (no attempts) → assistant correctly responds *"There's no recent activity in this class to summarise yet."* (test it explicitly).
- A request that exceeds 60s returns a clean 502 toast, not a hang.

---

## Teacher chat checklist

### Schema
- [ ] Create `supabase/schema-teacher-chat.sql` with the §2 DDL.
- [ ] Apply the schema in Supabase SQL Editor.
- [ ] Verify RLS policies block cross-teacher access (manual SQL test with two test users).

### Server
- [ ] Create `lib/teacher-chat-context.ts` with the `ClassSnapshot` type and builder.
- [ ] Implement `GET /api/teacher/chat/route.ts` (list).
- [ ] Implement `POST /api/teacher/chat/route.ts` (create + class ownership check).
- [ ] Implement `GET /api/teacher/chat/[chatId]/route.ts` (fetch + messages).
- [ ] Implement `POST /api/teacher/chat/[chatId]/messages/route.ts` (send → snapshot → Gemini → persist).
- [ ] Implement `DELETE /api/teacher/chat/[chatId]/route.ts`.
- [ ] 60s Gemini timeout returns 502 (mirror `/api/mark`).
- [ ] Auto-title chat from first user message (≤60 chars) when title is still `'New chat'`.

### UI
- [ ] Build `components/teacher/ChatSidebar.tsx`.
- [ ] Build `components/teacher/ChatThread.tsx` (markdown rendering).
- [ ] Build `components/teacher/ChatComposer.tsx` (auto-grow, Cmd/Ctrl+Enter, disabled in-flight).
- [ ] Build `components/teacher/ChatHeroCard.tsx` (with Hover Border Gradient chips).
- [ ] Build `app/teacher/chat/page.tsx`.
- [ ] Build `app/teacher/chat/[chatId]/page.tsx`.
- [ ] Add `ChatHeroCard` at the top of `app/teacher/dashboard/page.tsx`.

### Tests / smoke
- [ ] Empty class → assistant says no recent activity.
- [ ] Cross-teacher isolation verified.
- [ ] Refresh on `/teacher/chat/[chatId]` restores full thread.
- [ ] Suggestion chip click prefills composer + creates chat.
- [ ] `pnpm run build` green; `pnpm exec eslint . --max-warnings 0` green.
