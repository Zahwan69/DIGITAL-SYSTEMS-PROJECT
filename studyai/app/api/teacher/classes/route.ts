import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateJoinCode } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!(await requireTeacher(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subject")?.trim() || null;

  let query = supabaseAdmin
    .from("classes")
    .select("id, name, join_code, created_at, subject_id")
    .eq("teacher_id", auth.userId)
    .order("created_at", { ascending: false });

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const classIds = (data ?? []).map((c) => c.id);
  let counts: Record<string, number> = {};
  if (classIds.length > 0) {
    const { data: members } = await supabaseAdmin
      .from("class_members")
      .select("class_id")
      .in("class_id", classIds);
    counts = (members ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.class_id] = (acc[row.class_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const classes = (data ?? []).map((c) => ({
    ...c,
    member_count: counts[c.id] ?? 0,
  }));

  return NextResponse.json({ classes });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!(await requireTeacher(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    subjectId?: string | null;
  } | null;
  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Class name is required." }, { status: 400 });
  }

  const subjectId =
    typeof body?.subjectId === "string" && body.subjectId.trim() ? body.subjectId.trim() : null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = generateJoinCode();
    const { data, error } = await supabaseAdmin
      .from("classes")
      .insert({
        teacher_id: auth.userId,
        name,
        join_code: joinCode,
        ...(subjectId ? { subject_id: subjectId } : {}),
      })
      .select("id, name, join_code, created_at, subject_id")
      .single();

    if (!error && data) {
      return NextResponse.json({ class: { ...data, member_count: 0 } });
    }

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique join code. Please try again." },
    { status: 500 }
  );
}
