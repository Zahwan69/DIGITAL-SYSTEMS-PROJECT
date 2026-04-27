import { NextResponse } from "next/server";

import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: papers, error, count } = await supabaseAdmin
    .from("past_papers")
    .select("id, subject_name, syllabus_code, year, level, question_count, created_at, uploaded_by", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uploaderIds = [...new Set((papers ?? []).map((p) => p.uploaded_by as string))];
  let profileMap: Record<string, { username: string | null; full_name: string | null }> = {};
  if (uploaderIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", uploaderIds);
    profileMap = Object.fromEntries(
      (profs ?? []).map((p) => [
        p.id as string,
        { username: p.username as string | null, full_name: p.full_name as string | null },
      ])
    );
  }

  const rows = (papers ?? []).map((p) => {
    const prof = profileMap[p.uploaded_by as string];
    return {
      id: p.id,
      subject_name: p.subject_name,
      syllabus_code: p.syllabus_code,
      year: p.year,
      level: p.level,
      question_count: p.question_count,
      created_at: p.created_at,
      uploaded_by: p.uploaded_by,
      uploader_username: prof?.username ?? null,
      uploader_full_name: prof?.full_name ?? null,
    };
  });

  return NextResponse.json({ papers: rows, page, pageSize, total: count ?? 0 });
}
