import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function requireTeacher(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "teacher";
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!(await requireTeacher(auth.userId))) {
    return NextResponse.json({ error: "Teacher role required." }, { status: 403 });
  }

  const { data: links, error: linksError } = await supabaseAdmin
    .from("teacher_subjects")
    .select("subject_id")
    .eq("teacher_id", auth.userId);

  if (linksError) {
    if (linksError.message.toLowerCase().includes("relation") || linksError.code === "42P01") {
      return NextResponse.json({ subjects: [] });
    }
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const ids = [...new Set((links ?? []).map((l) => l.subject_id).filter(Boolean))];
  if (ids.length === 0) {
    return NextResponse.json({ subjects: [] });
  }

  const { data: subjects, error: subErr } = await supabaseAdmin
    .from("subjects")
    .select("id, name, syllabus_code, level")
    .in("id", ids);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  return NextResponse.json({ subjects: subjects ?? [] });
}
