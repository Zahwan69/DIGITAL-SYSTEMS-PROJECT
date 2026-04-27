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

function startOfWeekMonday(d: Date): Date {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function weekKey(d: Date): string {
  const s = startOfWeekMonday(d);
  return s.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (!(await requireTeacher(auth.userId))) {
    return NextResponse.json({ error: "Teacher role required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subject")?.trim() || null;

  let classesQuery = supabaseAdmin
    .from("classes")
    .select("id, name, join_code, created_at, subject_id")
    .eq("teacher_id", auth.userId)
    .order("created_at", { ascending: false });

  if (subjectId) {
    classesQuery = classesQuery.eq("subject_id", subjectId);
  }

  const { data: classes, error: classesError } = await classesQuery;

  if (classesError) {
    return NextResponse.json({ error: classesError.message }, { status: 500 });
  }

  const classList = classes ?? [];
  const classIds = classList.map((c) => c.id);
  if (classIds.length === 0) {
    return NextResponse.json({
      kpis: { activeStudents: 0, assignmentsThisWeek: 0, averageScore: null as number | null },
      chart: [] as { week: string; byClass: Record<string, number | null> }[],
      classes: [],
      recentAttempts: [],
    });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const [{ data: members }, { data: assignments }, { data: assignmentsWeek }] = await Promise.all([
    supabaseAdmin.from("class_members").select("student_id, class_id").in("class_id", classIds),
    supabaseAdmin
      .from("assignments")
      .select("id, class_id, paper_id, title, created_at")
      .in("class_id", classIds),
    supabaseAdmin
      .from("assignments")
      .select("id")
      .in("class_id", classIds)
      .gte("created_at", weekAgo.toISOString()),
  ]);

  const memberRows = members ?? [];
  const activeStudents = new Set(memberRows.map((m) => m.student_id)).size;
  const assignmentsThisWeek = assignmentsWeek?.length ?? 0;

  const assignmentRows = assignments ?? [];
  const paperIds = [...new Set(assignmentRows.map((a) => a.paper_id))];

  const paperToClassIds = new Map<string, string[]>();
  for (const a of assignmentRows) {
    const list = paperToClassIds.get(a.paper_id) ?? [];
    list.push(a.class_id);
    paperToClassIds.set(a.paper_id, list);
  }

  let averageScore: number | null = null;
  const chartBuckets = new Map<string, Map<string, number[]>>();
  const recentAttempts: Array<{
    id: string;
    percentage: number;
    created_at: string;
    studentLabel: string;
    questionId: string;
    paperId: string;
    className: string;
  }> = [];

  if (paperIds.length > 0) {
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, paper_id")
      .in("paper_id", paperIds);

    const questionIds = (questions ?? []).map((q) => q.id);
    const qPaper = new Map((questions ?? []).map((q) => [q.id, q.paper_id]));

    if (questionIds.length > 0) {
      const { data: attempts } = await supabaseAdmin
        .from("attempts")
        .select("id, user_id, question_id, percentage, created_at")
        .in("question_id", questionIds)
        .gte("created_at", twelveWeeksAgo.toISOString())
        .order("created_at", { ascending: false });

      const attemptRows = attempts ?? [];
      const scored = attemptRows.filter((a) => {
        const pid = qPaper.get(a.question_id);
        if (!pid) return false;
        return (paperToClassIds.get(pid) ?? []).length > 0;
      });

      if (scored.length > 0) {
        averageScore =
          scored.reduce((s, a) => s + Number(a.percentage), 0) / scored.length;
      }

      const classNameById = new Map(classList.map((c) => [c.id, c.name]));

      for (const a of scored) {
        const pid = qPaper.get(a.question_id);
        if (!pid) continue;
        const cids = paperToClassIds.get(pid) ?? [];
        const wk = weekKey(new Date(a.created_at));
        for (const cid of cids) {
          if (!classIds.includes(cid)) continue;
          if (!chartBuckets.has(wk)) chartBuckets.set(wk, new Map());
          const byC = chartBuckets.get(wk)!;
          const arr = byC.get(cid) ?? [];
          arr.push(Number(a.percentage));
          byC.set(cid, arr);
        }
      }

      const studentIds = [...new Set(attemptRows.map((x) => x.user_id))];
      let profiles: Record<string, { username: string | null; full_name: string | null }> = {};
      if (studentIds.length > 0) {
        const { data: profs } = await supabaseAdmin
          .from("profiles")
          .select("id, username, full_name")
          .in("id", studentIds);
        profiles = Object.fromEntries(
          (profs ?? []).map((p) => [
            p.id,
            { username: p.username as string | null, full_name: p.full_name as string | null },
          ])
        );
      }

      const top = attemptRows.slice(0, 40);
      for (const a of top) {
        const pid = qPaper.get(a.question_id);
        if (!pid) continue;
        const cids = paperToClassIds.get(pid) ?? [];
        const cid = cids.find((id) => classIds.includes(id));
        if (!cid) continue;
        const pr = profiles[a.user_id];
        recentAttempts.push({
          id: a.id,
          percentage: Number(a.percentage),
          created_at: a.created_at,
          studentLabel: pr?.full_name || pr?.username || "Student",
          questionId: a.question_id,
          paperId: pid,
          className: classNameById.get(cid) ?? "Class",
        });
        if (recentAttempts.length >= 10) break;
      }
    }
  }

  const sortedWeeks = [...chartBuckets.keys()].sort();
  const chart = sortedWeeks.map((week) => {
    const byClass: Record<string, number | null> = {};
    const inner = chartBuckets.get(week)!;
    for (const [cid, vals] of inner) {
      byClass[cid] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }
    return { week, byClass };
  });

  const memberCountByClass = memberRows.reduce<Record<string, number>>((acc, m) => {
    acc[m.class_id] = (acc[m.class_id] ?? 0) + 1;
    return acc;
  }, {});

  const assignmentCountByClass = assignmentRows.reduce<Record<string, number>>((acc, m) => {
    acc[m.class_id] = (acc[m.class_id] ?? 0) + 1;
    return acc;
  }, {});

  const classesOut = classList.map((c) => ({
    id: c.id,
    name: c.name,
    join_code: c.join_code,
    created_at: c.created_at,
    member_count: memberCountByClass[c.id] ?? 0,
    assignment_count: assignmentCountByClass[c.id] ?? 0,
  }));

  return NextResponse.json({
    kpis: {
      activeStudents,
      assignmentsThisWeek,
      averageScore: averageScore !== null ? Math.round(averageScore * 10) / 10 : null,
    },
    chart,
    classes: classesOut,
    recentAttempts,
  });
}
