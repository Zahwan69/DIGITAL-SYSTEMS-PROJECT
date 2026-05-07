"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ChatComposer } from "@/components/teacher/ChatComposer";
import { ChatListItem, ChatSidebar } from "@/components/teacher/ChatSidebar";
import { ChatMessage, ChatThread } from "@/components/teacher/ChatThread";
import { supabase } from "@/lib/supabase";

type TeacherClass = { id: string; name: string };

async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Signed-in teacher session required.");
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export function TeacherChatSurface({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? "";
  const initialQuery = searchParams.get("q") ?? "";
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classId, setClassId] = useState(initialClassId);
  const [chatId, setChatId] = useState(initialChatId ?? "");
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const locked = Boolean(chatId || messages.length > 0);

  const selectedClassName = useMemo(
    () => classes.find((row) => row.id === classId)?.name ?? "Select class",
    [classes, classId]
  );

  useEffect(() => {
    async function load() {
      const classResponse = await authFetch("/api/teacher/classes");
      if (classResponse.ok) {
        const payload = (await classResponse.json()) as { classes?: TeacherClass[] };
        const rows = payload.classes ?? [];
        setClasses(rows);
        setClassId((current) => current || rows[0]?.id || "");
      }
      const chatResponse = await authFetch("/api/teacher/chat");
      if (chatResponse.ok) setChats((await chatResponse.json()) as ChatListItem[]);
    }
    void load();
  }, []);

  useEffect(() => {
    if (!initialChatId) return;
    async function loadChat() {
      const response = await authFetch(`/api/teacher/chat/${initialChatId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        chat: { id: string; classId: string };
        messages: ChatMessage[];
      };
      setChatId(payload.chat.id);
      setClassId(payload.chat.classId);
      setMessages(payload.messages);
    }
    void loadChat();
  }, [initialChatId]);

  async function ensureChat() {
    if (chatId) return chatId;
    if (!classId) throw new Error("Choose a class before starting chat.");
    const response = await authFetch("/api/teacher/chat", {
      method: "POST",
      body: JSON.stringify({ classId }),
    });
    if (!response.ok) throw new Error("Could not create chat.");
    const payload = (await response.json()) as { id: string };
    setChatId(payload.id);
    router.replace(`/teacher/chat/${payload.id}`);
    return payload.id;
  }

  async function send() {
    const content = draft.trim();
    if (!content || loading) return;
    setLoading(true);
    setDraft("");
    const localMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, localMessage]);
    try {
      const id = await ensureChat();
      const response = await authFetch(`/api/teacher/chat/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("The AI request failed.");
      const payload = (await response.json()) as { assistantMessage: ChatMessage };
      setMessages((current) => [...current, payload.assistantMessage]);
      const chatResponse = await authFetch("/api/teacher/chat");
      if (chatResponse.ok) setChats((await chatResponse.json()) as ChatListItem[]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-88px)] overflow-hidden rounded-xl border border-border bg-surface">
      <ChatSidebar chats={chats} activeChatId={chatId} onNewChat={() => router.push("/teacher/chat")} />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Class chat</p>
            <p className="text-sm font-semibold text-text">{selectedClassName}</p>
          </div>
          <select
            value={classId}
            disabled={locked}
            onChange={(event) => setClassId(event.target.value)}
            className="h-9 rounded-[10px] border border-border bg-surface px-3 text-sm text-text disabled:opacity-60"
          >
            {classes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatThread messages={messages} loading={loading} />
        </div>
        <ChatComposer value={draft} onChange={setDraft} onSend={send} disabled={loading || !classId} />
      </section>
    </div>
  );
}
