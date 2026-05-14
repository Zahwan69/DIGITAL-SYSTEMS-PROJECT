import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { generateGeminiContent } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildUnifiedTeacherPrompt,
  loadUnifiedTeacherContext,
} from "@/lib/teacher-chat-prompts";

async function assertTeacher(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return { ok: false as const, response: NextResponse.json({ error: auth.message }, { status: auth.status }) };
  if (!(await requireTeacher(auth.userId))) return { ok: false as const, response: new NextResponse(null, { status: 403 }) };
  return { ok: true as const, userId: auth.userId };
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Gemini request timed out.")), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;
  const { chatId } = await params;

  const body = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });

  const { data: chat, error: chatError } = await supabaseAdmin
    .from("teacher_chats")
    .select("id, class_id, title, mode, paper_id, subject_id, syllabus_text, syllabus_filename")
    .eq("id", chatId)
    .eq("teacher_id", gate.userId)
    .single();

  if (chatError || !chat) {
    return NextResponse.json(
      { error: chatError?.message ?? "Chat not found." },
      { status: chatError ? 500 : 404 }
    );
  }

  let systemPrompt: string;
  try {
    const unifiedContext = await loadUnifiedTeacherContext({
      classId: chat.class_id ?? null,
      teacherId: gate.userId,
      paperId: chat.paper_id ?? null,
      subjectId: chat.subject_id ?? null,
      syllabusText: chat.syllabus_text ?? null,
      syllabusFilename: chat.syllabus_filename ?? null,
    });
    systemPrompt = buildUnifiedTeacherPrompt(unifiedContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load chat context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: userMessage, error: userInsertError } = await supabaseAdmin
    .from("teacher_chat_messages")
    .insert({ chat_id: chatId, role: "user", content })
    .select("id, role, content, created_at")
    .single();

  if (userInsertError) return NextResponse.json({ error: userInsertError.message }, { status: 500 });

  const { data: history, error: historyError } = await supabaseAdmin
    .from("teacher_chat_messages")
    .select("role, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 });

  const transcript = (history ?? [])
    .reverse()
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  try {
    const { result } = await withTimeout(
      generateGeminiContent([{ text: `${systemPrompt}\n\nChat history:\n${transcript}` }]),
      60000
    );
    const assistantText = result.response.text();

    const { data: assistantMessage, error: assistantInsertError } = await supabaseAdmin
      .from("teacher_chat_messages")
      .insert({ chat_id: chatId, role: "assistant", content: assistantText })
      .select("id, role, content, created_at")
      .single();

    if (assistantInsertError) return NextResponse.json({ error: assistantInsertError.message }, { status: 500 });

    await supabaseAdmin
      .from("teacher_chats")
      .update({
        last_message_at: new Date().toISOString(),
        ...(chat.title === "New chat" ? { title: content.slice(0, 60) } : {}),
      })
      .eq("id", chatId)
      .eq("teacher_id", gate.userId);

    return NextResponse.json({ userMessage, assistantMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    const fallback =
      "I could not generate a full AI response just now. Your message was saved, but the AI request failed. Please try again in a moment.";

    const { data: assistantMessage, error: assistantInsertError } = await supabaseAdmin
      .from("teacher_chat_messages")
      .insert({ chat_id: chatId, role: "assistant", content: fallback })
      .select("id, role, content, created_at")
      .single();

    if (assistantInsertError) {
      return NextResponse.json({ error: message }, { status: 502 });
    }

    await supabaseAdmin
      .from("teacher_chats")
      .update({
        last_message_at: new Date().toISOString(),
        ...(chat.title === "New chat" ? { title: content.slice(0, 60) } : {}),
      })
      .eq("id", chatId)
      .eq("teacher_id", gate.userId);

    return NextResponse.json({ userMessage, assistantMessage, aiError: message });
  }
}
