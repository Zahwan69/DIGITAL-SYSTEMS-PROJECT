import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { geminiFlash } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildClassSnapshot } from "@/lib/teacher-chat-context";

async function assertTeacher(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return { ok: false as const, response: NextResponse.json({ error: auth.message }, { status: auth.status }) };
  if (!(await requireTeacher(auth.userId))) return { ok: false as const, response: new NextResponse(null, { status: 403 }) };
  return { ok: true as const, userId: auth.userId };
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini request timed out.")), ms)),
  ]);
}

export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;
  const { chatId } = await params;

  const body = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 400 });

  const { data: chat } = await supabaseAdmin
    .from("teacher_chats")
    .select("id, class_id, title")
    .eq("id", chatId)
    .eq("teacher_id", gate.userId)
    .single();

  if (!chat) return new NextResponse(null, { status: 404 });

  const { error: userInsertError } = await supabaseAdmin
    .from("teacher_chat_messages")
    .insert({ chat_id: chatId, role: "user", content });

  if (userInsertError) return NextResponse.json({ error: userInsertError.message }, { status: 500 });

  const { data: history } = await supabaseAdmin
    .from("teacher_chat_messages")
    .select("role, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(20);

  const snapshot = await buildClassSnapshot(chat.class_id, gate.userId);
  const system = `Only answer using the data provided. If the snapshot does not contain the answer, say so. Do not invent student names or scores.

Class snapshot:
${JSON.stringify(snapshot, null, 2)}`;

  const transcript = (history ?? [])
    .reverse()
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n\n");

  try {
    const result = await withTimeout(
      geminiFlash.generateContent([{ text: `${system}\n\nChat history:\n${transcript}\n\nuser: ${content}` }]),
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

    return NextResponse.json({ assistantMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
