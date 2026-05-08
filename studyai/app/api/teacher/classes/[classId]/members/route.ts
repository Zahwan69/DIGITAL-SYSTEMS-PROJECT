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

  const { data: members, error } = await supabaseAdmin
    .from("class_members")
    .select("id, student_id, joined_at")
    .eq("class_id", classId)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const studentIds = (members ?? []).map((m) => m.student_id);
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

  const enriched = (members ?? []).map((m) => ({
    id: m.id,
    student_id: m.student_id,
    joined_at: m.joined_at,
    username: profiles[m.student_id]?.username ?? null,
    full_name: profiles[m.student_id]?.full_name ?? null,
  }));

  return NextResponse.json({ members: enriched });
}
