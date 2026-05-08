import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data: memberships, error: memberError } = await supabaseAdmin
    .from("class_members")
    .select("class_id")
    .eq("student_id", auth.userId);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (classIds.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const { data: assignments, error } = await supabaseAdmin
    .from("assignments")
    .select("id, class_id, paper_id, title, instructions, due_date, created_at")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const paperIds = Array.from(new Set((assignments ?? []).map((a) => a.paper_id)));
  const uniqueClassIds = Array.from(new Set((assignments ?? []).map((a) => a.class_id)));

  const [papersResult, classesResult] = await Promise.all([
    paperIds.length
      ? supabaseAdmin
          .from("past_papers")
          .select("id, subject_name, syllabus_code")
          .in("id", paperIds)
      : Promise.resolve({ data: [] as { id: string; subject_name: string; syllabus_code: string }[] }),
    uniqueClassIds.length
      ? supabaseAdmin
          .from("classes")
          .select("id, name")
          .in("id", uniqueClassIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const papers = (papersResult.data ?? []).reduce<Record<string, { subject_name: string; syllabus_code: string }>>(
    (acc, row) => {
      acc[row.id] = { subject_name: row.subject_name, syllabus_code: row.syllabus_code };
      return acc;
    },
    {}
  );
  const classes = (classesResult.data ?? []).reduce<Record<string, string>>(
    (acc, row) => {
      acc[row.id] = row.name;
      return acc;
    },
    {}
  );

  const enriched = (assignments ?? []).map((a) => ({
    ...a,
    class_name: classes[a.class_id] ?? null,
    paper: papers[a.paper_id] ?? null,
  }));

  return NextResponse.json({ assignments: enriched });
}
