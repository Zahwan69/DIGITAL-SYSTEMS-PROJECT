import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { extractPdfText } from "@/lib/pdf-text";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;

async function assertTeacher(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return { ok: false as const, response: NextResponse.json({ error: auth.message }, { status: auth.status }) };
  if (!(await requireTeacher(auth.userId))) return { ok: false as const, response: new NextResponse(null, { status: 403 }) };
  return { ok: true as const, userId: auth.userId };
}

async function ensureChatOwner(chatId: string, teacherId: string) {
  const { data } = await supabaseAdmin
    .from("teacher_chats")
    .select("id")
    .eq("id", chatId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  return Boolean(data);
}

export async function POST(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;
  const { chatId } = await params;

  if (!(await ensureChatOwner(chatId, gate.userId))) {
    return new NextResponse(null, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Multipart form data required." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "Syllabus must be 10 MB or smaller." }, { status: 400 });
  }

  let extracted: { text: string; pageCount: number };
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    extracted = await extractPdfText(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read PDF.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  if (!extracted.text) {
    return NextResponse.json(
      { error: "No selectable text found in this PDF — is it a scan?" },
      { status: 422 }
    );
  }

  const truncated = extracted.text.slice(0, MAX_TEXT_CHARS);

  const { error: updateError } = await supabaseAdmin
    .from("teacher_chats")
    .update({
      syllabus_text: truncated,
      syllabus_filename: file.name,
    })
    .eq("id", chatId)
    .eq("teacher_id", gate.userId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    filename: file.name,
    pageCount: extracted.pageCount,
    charCount: truncated.length,
    truncated: extracted.text.length > MAX_TEXT_CHARS,
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;
  const { chatId } = await params;

  if (!(await ensureChatOwner(chatId, gate.userId))) {
    return new NextResponse(null, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("teacher_chats")
    .update({ syllabus_text: null, syllabus_filename: null })
    .eq("id", chatId)
    .eq("teacher_id", gate.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
