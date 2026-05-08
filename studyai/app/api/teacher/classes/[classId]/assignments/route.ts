import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function ensureClassOwner(classId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireTeacher(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { classId } = await params;

  if (!(await ensureClassOwner(classId, auth.userId))) {
    return NextResponse.json(
      { error: "Class not found or not owned by you." },
      { status: 404 }
    );
  }

  const { data: assignments, error } = await supabaseAdmin
    .from("assignments")
    .select("id, paper_id, title, instructions, due_date, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const paperIds = Array.from(new Set((assignments ?? []).map((a) => a.paper_id)));
  let papers: Record<string, { subject_name: string; syllabus_code: string }> = {};
  if (paperIds.length > 0) {
    const { data: paperRows } = await supabaseAdmin
      .from("past_papers")
      .select("id, subject_name, syllabus_code")
      .in("id", paperIds);
    papers = (paperRows ?? []).reduce<typeof papers>((acc, row) => {
      acc[row.id] = {
        subject_name: row.subject_name,
        syllabus_code: row.syllabus_code,
      };
      return acc;
    }, {});
  }

  const enriched = (assignments ?? []).map((a) => ({
    ...a,
    paper: papers[a.paper_id] ?? null,
  }));

  return NextResponse.json({ assignments: enriched });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireTeacher(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { classId } = await params;

  if (!(await ensureClassOwner(classId, auth.userId))) {
    return NextResponse.json(
      { error: "Class not found or not owned by you." },
      { status: 404 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    paperId?: string;
    title?: string;
    instructions?: string;
    dueDate?: string | null;
  } | null;

  const paperId = body?.paperId?.trim();
  const title = body?.title?.trim();
  const instructions = body?.instructions?.trim() || null;
  const dueDate = body?.dueDate?.trim() ? body.dueDate : null;

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const { data: paper } = await supabaseAdmin
    .from("past_papers")
    .select("id")
    .eq("id", paperId)
    .maybeSingle();
  if (!paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .insert({
      class_id: classId,
      paper_id: paperId,
      title,
      instructions,
      due_date: dueDate,
      created_by: auth.userId,
    })
    .select("id, paper_id, title, instructions, due_date, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create assignment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ assignment: data });
}
