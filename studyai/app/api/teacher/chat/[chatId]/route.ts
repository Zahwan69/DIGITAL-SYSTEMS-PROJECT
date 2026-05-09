import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function assertTeacher(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return { ok: false as const, response: NextResponse.json({ error: auth.message }, { status: auth.status }) };
  if (!(await requireTeacher(auth.userId))) return { ok: false as const, response: new NextResponse(null, { status: 403 }) };
  return { ok: true as const, userId: auth.userId };
}

export async function GET(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;
  const { chatId } = await params;

  const { data: chat, error } = await supabaseAdmin
    .from("teacher_chats")
    .select(
      "id, class_id, title, created_at, last_message_at, mode, paper_id, subject_id, syllabus_filename, classes(name)"
    )
    .eq("id", chatId)
    .eq("teacher_id", gate.userId)
    .single();

  if (error || !chat) return new NextResponse(null, { status: 404 });

  const { data: messages, error: messagesError } = await supabaseAdmin
    .from("teacher_chat_messages")
    .select("id, role, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 });

  return NextResponse.json({
    chat: {
      id: chat.id,
      classId: chat.class_id,
      className: firstRelation(chat.classes)?.name ?? "Class",
      title: chat.title,
      createdAt: chat.created_at,
      lastMessageAt: chat.last_message_at,
      mode: (chat.mode ?? "class-analytics") as "class-analytics" | "paper-review" | "write-questions",
      paperId: chat.paper_id ?? null,
      subjectId: chat.subject_id ?? null,
      syllabusFilename: chat.syllabus_filename ?? null,
    },
    messages: messages ?? [],
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;
  const { chatId } = await params;

  const { error } = await supabaseAdmin
    .from("teacher_chats")
    .delete()
    .eq("id", chatId)
    .eq("teacher_id", gate.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
