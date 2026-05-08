import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

  let classQuery = supabaseAdmin.from("classes").select("id, name, subject_id").eq("teacher_id", auth.userId);
  if (subjectId) {
    classQuery = classQuery.eq("subject_id", subjectId);
  }
  const { data: classes, error: classErr } = await classQuery;
  if (classErr) {
    return NextResponse.json({ error: classErr.message }, { status: 500 });
  }

  const classIds = (classes ?? []).map((c) => c.id);
  const className = Object.fromEntries((classes ?? []).map((c) => [c.id, c.name]));

  if (classIds.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const { data: rows, error } = await supabaseAdmin
    .from("assignments")
    .select("id, class_id, paper_id, title, due_date, created_at")
    .in("class_id", classIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assignments = (rows ?? []).map((r) => ({
    ...r,
    class_name: className[r.class_id] ?? "Class",
  }));

  return NextResponse.json({ assignments });
}
