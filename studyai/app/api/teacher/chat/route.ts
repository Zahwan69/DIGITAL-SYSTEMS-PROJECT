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
    .select("id, class_id, title, last_message_at, classes!inner(name)")
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
    }))
  );
}

export async function POST(request: Request) {
  const gate = await assertTeacher(request);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => null)) as { classId?: string } | null;
  const classId = body?.classId?.trim();
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const { data: classRow } = await supabaseAdmin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", gate.userId)
    .single();

  if (!classRow) return new NextResponse(null, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("teacher_chats")
    .insert({ teacher_id: gate.userId, class_id: classId })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
