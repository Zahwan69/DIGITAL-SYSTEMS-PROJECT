import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data: invites, error } = await supabaseAdmin
    .from("class_invites")
    .select("id, class_id, invited_by, status, created_at")
    .eq("student_id", auth.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const classIds = Array.from(new Set((invites ?? []).map((i) => i.class_id)));
  const teacherIds = Array.from(new Set((invites ?? []).map((i) => i.invited_by)));

  const [classesResult, teachersResult] = await Promise.all([
    classIds.length
      ? supabaseAdmin
          .from("classes")
          .select("id, name")
          .in("id", classIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    teacherIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id, username, full_name")
          .in("id", teacherIds)
      : Promise.resolve({ data: [] as { id: string; username: string | null; full_name: string | null }[] }),
  ]);

  const classes = (classesResult.data ?? []).reduce<Record<string, string>>(
    (acc, row) => {
      acc[row.id] = row.name;
      return acc;
    },
    {}
  );
  const teachers = (teachersResult.data ?? []).reduce<Record<string, { username: string | null; full_name: string | null }>>(
    (acc, row) => {
      acc[row.id] = { username: row.username, full_name: row.full_name };
      return acc;
    },
    {}
  );

  const enriched = (invites ?? []).map((i) => ({
    ...i,
    class_name: classes[i.class_id] ?? null,
    teacher: teachers[i.invited_by] ?? null,
  }));

  return NextResponse.json({ invites: enriched });
}
