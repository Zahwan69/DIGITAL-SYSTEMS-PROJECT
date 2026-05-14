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
  if (!(await requireTeacher(auth.userId))) {
    return { ok: false as const, response: new NextResponse(null, { status: 403 }) };
  }
  return { ok: true as const, userId: auth.userId };
}

export async function GET(request: Request) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  let query = supabaseAdmin
    .from("teacher_chats")
    .select("id, class_id, title, last_message_at, mode, paper_id, subject_id, classes!inner(name)")
    .eq("teacher_id", gate.userId)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((chat) => ({
      id: chat.id,
      classId: chat.class_id,
      className: firstRelation(chat.classes)?.name ?? "Class",
      title: chat.title,
      lastMessageAt: chat.last_message_at,
      mode: (chat.mode ?? "class-analytics") as "class-analytics" | "paper-review" | "write-questions",
      paperId: chat.paper_id ?? null,
      subjectId: chat.subject_id ?? null,
    }))
  );
}

type CreateChatBody = {
  classId?: string;
  // mode is accepted for backward compatibility but ignored — the unified
  // assistant infers intent from each message. All new chats are inserted
  // with mode='class-analytics' so the DB CHECK constraint is satisfied.
  mode?: string;
  paperId?: string | null;
  subjectId?: string | null;
};

export async function POST(request: Request) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => null)) as CreateChatBody | null;
  const classId = body?.classId?.trim();
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const paperId = body?.paperId?.trim() || null;
  const subjectId = body?.subjectId?.trim() || null;

  const { data: classRow } = await supabaseAdmin
    .from("classes")
    .select("id, subject_id")
    .eq("id", classId)
    .eq("teacher_id", gate.userId)
    .single();

  if (!classRow) return new NextResponse(null, { status: 403 });

  if (paperId) {
    const { data: paper } = await supabaseAdmin
      .from("past_papers")
      .select("id")
      .eq("id", paperId)
      .single();
    if (!paper) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  // If the teacher didn't pick a subject but the class has one set, default
  // to it so question generation can use the syllabus code automatically.
  const resolvedSubjectId = subjectId ?? classRow.subject_id ?? null;

  const { data, error } = await supabaseAdmin
    .from("teacher_chats")
    .insert({
      teacher_id: gate.userId,
      class_id: classId,
      mode: "class-analytics",
      paper_id: paperId,
      subject_id: resolvedSubjectId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
