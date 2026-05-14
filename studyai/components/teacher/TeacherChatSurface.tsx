"use client";

import { Paperclip, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatComposer } from "@/components/teacher/ChatComposer";
import { ChatListItem, ChatSidebar } from "@/components/teacher/ChatSidebar";
import { ChatMessage, ChatThread } from "@/components/teacher/ChatThread";
import { supabase } from "@/lib/supabase";

type TeacherClass = { id: string; name: string };
type Paper = { id: string; subject_name: string; syllabus_code: string };
type Subject = { id: string; name: string; syllabus_code: string | null; level: string | null };

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const token = await getToken();
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

async function authUpload(input: RequestInfo | URL, formData: FormData) {
  const token = await getToken();
  if (!token) throw new Error("Signed-in teacher session required.");
  return fetch(input, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

export function TeacherChatSurface({ initialChatId }: { initialChatId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState(initialClassId);
  const [chatId, setChatId] = useState(initialChatId ?? "");
  const [paperId, setPaperId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [syllabusFilename, setSyllabusFilename] = useState<string | null>(null);
  const [syllabusBusy, setSyllabusBusy] = useState(false);
  const [syllabusError, setSyllabusError] = useState<string | null>(null);

  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  // Chips lock once the chat exists or has any messages, mirroring the
  // previous mode-lock behaviour. Context-swap mid-chat is out of MVP scope.
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

  // Load papers + subjects up-front so all context chips work in one chat.
  useEffect(() => {
    async function loadPapers() {
      const { data } = await supabase
        .from("past_papers")
        .select("id, subject_name, syllabus_code")
        .order("created_at", { ascending: false })
        .limit(100);
      setPapers((data ?? []) as Paper[]);
    }
    async function loadSubjects() {
      const response = await authFetch("/api/teacher/subjects");
      if (!response.ok) return;
      const payload = (await response.json()) as { subjects?: Subject[] };
      setSubjects(payload.subjects ?? []);
    }
    void loadPapers();
    void loadSubjects();
  }, []);

  useEffect(() => {
    if (!initialChatId) return;
    async function loadChat() {
      const response = await authFetch(`/api/teacher/chat/${initialChatId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        chat: {
          id: string;
          classId: string;
          paperId: string | null;
          subjectId: string | null;
          syllabusFilename: string | null;
        };
        messages: ChatMessage[];
      };
      setChatId(payload.chat.id);
      setClassId(payload.chat.classId);
      setPaperId(payload.chat.paperId ?? "");
      setSubjectId(payload.chat.subjectId ?? "");
      setSyllabusFilename(payload.chat.syllabusFilename);
      setMessages(payload.messages);
    }
    void loadChat();
  }, [initialChatId]);

  useEffect(() => {
    const node = threadScrollRef.current;
    if (!node) return;
    const frame = window.requestAnimationFrame(() => {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length, loading]);

  async function ensureChat() {
    if (chatId) return chatId;
    if (!classId) throw new Error("Choose a class before starting chat.");
    const response = await authFetch("/api/teacher/chat", {
      method: "POST",
      body: JSON.stringify({
        classId,
        paperId: paperId || null,
        subjectId: subjectId || null,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Could not create chat.");
    }
    const payload = (await response.json()) as { id: string };
    setChatId(payload.id);
    window.history.replaceState(null, "", `/teacher/chat/${payload.id}`);
    return payload.id;
  }

  async function send() {
    const content = draft.trim();
    if (!content || loading) return;
    setLoading(true);
    setSendError(null);
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
      const payload = (await response.json().catch(() => ({}))) as {
        userMessage?: ChatMessage;
        assistantMessage?: ChatMessage;
        error?: string;
      };
      if (!response.ok || !payload.assistantMessage) {
        throw new Error(payload.error ?? "The AI request failed.");
      }
      const assistantMessage = payload.assistantMessage;
      setMessages((current) => [
        ...current.map((message) =>
          message.id === localMessage.id ? payload.userMessage ?? localMessage : message
        ),
        assistantMessage,
      ]);
      const chatResponse = await authFetch("/api/teacher/chat");
      if (chatResponse.ok) setChats((await chatResponse.json()) as ChatListItem[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send the message.";
      setSendError(message);
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: message,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadSyllabus(file: File) {
    setSyllabusError(null);
    setSyllabusBusy(true);
    try {
      const id = await ensureChat();
      const fd = new FormData();
      fd.append("file", file);
      const response = await authUpload(`/api/teacher/chat/${id}/syllabus`, fd);
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        filename?: string;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Document upload failed.");
      }
      setSyllabusFilename(payload.filename ?? file.name);
    } catch (error) {
      setSyllabusError(error instanceof Error ? error.message : "Document upload failed.");
    } finally {
      setSyllabusBusy(false);
    }
  }

  async function clearSyllabus() {
    if (!chatId) {
      setSyllabusFilename(null);
      return;
    }
    setSyllabusBusy(true);
    try {
      const response = await fetch(`/api/teacher/chat/${chatId}/syllabus`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${(await getToken()) ?? ""}` },
      });
      if (response.ok) setSyllabusFilename(null);
    } finally {
      setSyllabusBusy(false);
    }
  }

  async function deleteChat(chat: ChatListItem) {
    if (deletingChatId) return;
    const ok = window.confirm(`Delete "${chat.title}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingChatId(chat.id);
    setSendError(null);
    try {
      const response = await authFetch(`/api/teacher/chat/${chat.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not delete chat.");
      }

      setChats((current) => current.filter((item) => item.id !== chat.id));
      if (chat.id === chatId) {
        setChatId("");
        setMessages([]);
        setDraft("");
        setPaperId("");
        setSubjectId("");
        setSyllabusFilename(null);
        router.push("/teacher/chat");
      }
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not delete chat.");
    } finally {
      setDeletingChatId(null);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-surface lg:h-[calc(100dvh-6rem)]">
      <ChatSidebar
        chats={chats}
        activeChatId={chatId}
        onNewChat={() => router.push("/teacher/chat")}
        onDeleteChat={deleteChat}
        deletingChatId={deletingChatId}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Teacher AI</p>
              <p className="text-sm font-semibold text-text">{selectedClassName}</p>
            </div>
            <p className="text-xs text-text-muted">
              Ask about analytics, paper review, question generation, marking, or coverage — one chat handles it all.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2 text-xs">
            <select
              value={classId}
              disabled={locked}
              onChange={(event) => setClassId(event.target.value)}
              className="h-9 rounded-[10px] border border-border bg-surface px-3 text-sm text-text disabled:opacity-60"
              aria-label="Class context"
            >
              {classes.length === 0 ? <option value="">No classes yet</option> : null}
              {classes.map((row) => (
                <option key={row.id} value={row.id}>
                  Class: {row.name}
                </option>
              ))}
            </select>
            <select
              value={paperId}
              disabled={locked}
              onChange={(event) => setPaperId(event.target.value)}
              className="h-9 rounded-[10px] border border-border bg-surface px-3 text-sm text-text disabled:opacity-60"
              aria-label="Paper context"
            >
              <option value="">Paper: none</option>
              {papers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  Paper: {paper.subject_name} · {paper.syllabus_code}
                </option>
              ))}
            </select>
            <select
              value={subjectId}
              disabled={locked}
              onChange={(event) => setSubjectId(event.target.value)}
              className="h-9 rounded-[10px] border border-border bg-surface px-3 text-sm text-text disabled:opacity-60"
              aria-label="Subject context"
            >
              <option value="">Subject: none</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  Subject: {subject.name}
                  {subject.syllabus_code ? ` · ${subject.syllabus_code}` : ""}
                </option>
              ))}
            </select>
            {syllabusFilename ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text">
                <Paperclip className="h-3.5 w-3.5 text-text-muted" />
                <span className="max-w-[180px] truncate">Attached: {syllabusFilename}</span>
                <button
                  type="button"
                  onClick={() => void clearSyllabus()}
                  disabled={syllabusBusy}
                  className="text-text-muted hover:text-text disabled:opacity-50"
                  aria-label="Remove attached document"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-surface px-2.5 py-1 text-xs text-text-muted">
                <Paperclip className="h-3.5 w-3.5" />
                Document: none (use + below)
              </span>
            )}
          </div>
        </header>
        <div ref={threadScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          <ChatThread messages={messages} loading={loading} />
        </div>
        {sendError ? (
          <div className="border-t border-border bg-surface px-4 py-2 text-sm text-danger">
            {sendError}
          </div>
        ) : null}
        <ChatComposer
          value={draft}
          onChange={setDraft}
          onSend={send}
          onAttach={(file) => void uploadSyllabus(file)}
          uploading={syllabusBusy}
          attachmentError={syllabusError}
          disabled={loading || !classId}
        />
      </section>
    </div>
  );
}
