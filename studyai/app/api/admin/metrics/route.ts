import { NextResponse } from "next/server";

import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const [
    { count: usersCount },
    { count: teachersCount },
    { count: adminsCount },
    { count: classesCount },
    { count: papersCount },
    { count: attemptsCount },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin"),
    supabaseAdmin.from("classes").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("past_papers").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("attempts").select("*", { count: "exact", head: true }),
  ]);

  const [{ data: signupsByDay }, { data: attemptsByDay }, { data: papersByDay }, { data: xpSum }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", sinceIso),
      supabaseAdmin.from("attempts").select("created_at").gte("created_at", sinceIso),
      supabaseAdmin.from("past_papers").select("created_at").gte("created_at", sinceIso),
      supabaseAdmin.from("attempts").select("xp_earned").gte("created_at", sinceIso),
    ]);

  const dayKey = (d: string) => d.slice(0, 10);
  const merge: Record<string, { day: string; signups: number; attempts: number; papers: number }> = {};

  for (const row of signupsByDay ?? []) {
    const k = dayKey(row.created_at as string);
    if (!merge[k]) merge[k] = { day: k, signups: 0, attempts: 0, papers: 0 };
    merge[k].signups += 1;
  }
  for (const row of attemptsByDay ?? []) {
    const k = dayKey(row.created_at as string);
    if (!merge[k]) merge[k] = { day: k, signups: 0, attempts: 0, papers: 0 };
    merge[k].attempts += 1;
  }
  for (const row of papersByDay ?? []) {
    const k = dayKey(row.created_at as string);
    if (!merge[k]) merge[k] = { day: k, signups: 0, attempts: 0, papers: 0 };
    merge[k].papers += 1;
  }

  const series = Object.values(merge).sort((a, b) => a.day.localeCompare(b.day));

  const usageXp = (xpSum ?? []).reduce((s, r) => s + Number(r.xp_earned ?? 0), 0);

  const { data: classesWithTeacher } = await supabaseAdmin
    .from("classes")
    .select("id, teacher_id, name");

  const teacherIds = [...new Set((classesWithTeacher ?? []).map((c) => c.teacher_id))];
  let topTeachers: { teacherId: string; label: string; studentCount: number }[] = [];

  if (teacherIds.length > 0) {
    const classIds = (classesWithTeacher ?? []).map((c) => c.id);
    const { data: members } = await supabaseAdmin.from("class_members").select("class_id").in("class_id", classIds);
    const countByClass = (members ?? []).reduce<Record<string, number>>((acc, m) => {
      acc[m.class_id] = (acc[m.class_id] ?? 0) + 1;
      return acc;
    }, {});
    const byTeacher: Record<string, number> = {};
    for (const c of classesWithTeacher ?? []) {
      byTeacher[c.teacher_id] = (byTeacher[c.teacher_id] ?? 0) + (countByClass[c.id] ?? 0);
    }
    const sorted = Object.entries(byTeacher).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in(
        "id",
        sorted.map(([id]) => id)
      );
    const labelById = Object.fromEntries(
      (profs ?? []).map((p) => [p.id as string, (p.full_name || p.username || p.id) as string])
    );
    topTeachers = sorted.map(([teacherId, studentCount]) => ({
      teacherId,
      label: labelById[teacherId] ?? teacherId,
      studentCount,
    }));
  }

  return NextResponse.json({
    totals: {
      users: usersCount ?? 0,
      teachers: teachersCount ?? 0,
      admins: adminsCount ?? 0,
      classes: classesCount ?? 0,
      papers: papersCount ?? 0,
      attempts: attemptsCount ?? 0,
    },
    series,
    usage: { xpEarnedLast30Days: usageXp },
    topTeachers,
  });
}
