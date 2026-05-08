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

  const { data: invites, error } = await supabaseAdmin
    .from("class_invites")
    .select("id, student_id, status, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const studentIds = (invites ?? []).map((i) => i.student_id);
  let profiles: Record<string, { username: string | null; full_name: string | null }> = {};
  if (studentIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", studentIds);
    profiles = (profileRows ?? []).reduce<typeof profiles>((acc, row) => {
      acc[row.id] = { username: row.username, full_name: row.full_name };
      return acc;
    }, {});
  }

  const enriched = (invites ?? []).map((i) => ({
    ...i,
    username: profiles[i.student_id]?.username ?? null,
    full_name: profiles[i.student_id]?.full_name ?? null,
  }));

  return NextResponse.json({ invites: enriched });
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
    studentId?: string;
  } | null;
  const studentId = body?.studentId?.trim();
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.role !== "student") {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const { data: alreadyMember } = await supabaseAdmin
    .from("class_members")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (alreadyMember) {
    return NextResponse.json(
      { error: "Student is already a member of this class." },
      { status: 409 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("class_invites")
    .select("id, status")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending") {
      return NextResponse.json(
        { error: "An invite is already pending for this student." },
        { status: 409 }
      );
    }
    const { data, error } = await supabaseAdmin
      .from("class_invites")
      .update({ status: "pending", invited_by: auth.userId })
      .eq("id", existing.id)
      .select("id, student_id, status, created_at")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to re-send invite." },
        { status: 500 }
      );
    }
    return NextResponse.json({ invite: data });
  }

  const { data, error } = await supabaseAdmin
    .from("class_invites")
    .insert({
      class_id: classId,
      student_id: studentId,
      invited_by: auth.userId,
      status: "pending",
    })
    .select("id, student_id, status, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create invite." },
      { status: 500 }
    );
  }

  return NextResponse.json({ invite: data });
}
