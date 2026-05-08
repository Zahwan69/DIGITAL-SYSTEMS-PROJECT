import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CAP = 500;

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
  const classIdFilter = searchParams.get("classId")?.trim() || null;

  let cq = supabaseAdmin.from("classes").select("id, name, subject_id").eq("teacher_id", auth.userId);
  if (subjectId) cq = cq.eq("subject_id", subjectId);
  if (classIdFilter) cq = cq.eq("id", classIdFilter);
  const { data: classes, error: ce } = await cq;
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });

  const classList = classes ?? [];
  const classIds = classList.map((c) => c.id);
  const classNameById = Object.fromEntries(classList.map((c) => [c.id, c.name]));

  if (classIds.length === 0) {
    return NextResponse.json({
      perStudentTrajectory: [],
      topicMastery: [],
      difficultyMix: [],
      assignmentFunnel: [],
      engagement: [],
      timeOfDay: Array.from({ length: 24 }, (_, hour) => ({ hour, attempts: 0 })),
      classComparison: [],
      cohortXp: [],
    });
  }

  const [{ data: members }, { data: assignments }] = await Promise.all([
    supabaseAdmin.from("class_members").select("class_id, student_id").in("class_id", classIds),
    supabaseAdmin.from("assignments").select("id, class_id, paper_id, title").in("class_id", classIds),
  ]);

  const memberRows = members ?? [];
  const studentIds = [...new Set(memberRows.map((m) => m.student_id))];
  const assignmentRows = assignments ?? [];
  const paperIds = [...new Set(assignmentRows.map((a) => a.paper_id))];

  if (paperIds.length === 0 || studentIds.length === 0) {
    return NextResponse.json({
      perStudentTrajectory: [],
      topicMastery: [],
      difficultyMix: [],
      assignmentFunnel: assignmentRows.slice(0, CAP).map((a) => ({
        assignmentId: a.id,
        title: a.title,
        assigned: memberRows.filter((m) => m.class_id === a.class_id).length,
        attempted: 0,
        completed: 0,
      })),
      engagement: [],
      timeOfDay: Array.from({ length: 24 }, (_, hour) => ({ hour, attempts: 0 })),
      classComparison: classList.map((c) => ({
        classId: c.id,
        className: c.name,
        avgPercentage: null as number | null,
        attempts: 0,
        students: memberRows.filter((m) => m.class_id === c.id).length,
      })),
      cohortXp: classList.map((c) => ({
        classId: c.id,
        className: c.name,
        xpLast30: 0,
        xpPerStudent: 0,
      })),
    });
  }

  const { data: questions } = await supabaseAdmin
    .from("questions")
    .select("id, paper_id, topic, difficulty")
    .in("paper_id", paperIds)
    .limit(CAP);

  const qRows = questions ?? [];
  const qids = qRows.map((q) => q.id);
  const qTopic = new Map(qRows.map((q) => [q.id, (q.topic as string | null) || "Uncategorized"]));
  const qDiff = new Map(qRows.map((q) => [q.id, q.difficulty as string]));
  const qPaper = new Map(qRows.map((q) => [q.id, q.paper_id as string]));
  const questionsByPaper = qRows.reduce<Record<string, string[]>>((acc, q) => {
    const pid = q.paper_id as string;
    acc[pid] = acc[pid] ?? [];
    acc[pid].push(q.id as string);
    return acc;
  }, {});

  const since28 = new Date();
  since28.setDate(since28.getDate() - 28);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const { data: attempts } = await supabaseAdmin
    .from("attempts")
    .select("id, user_id, question_id, percentage, xp_earned, created_at")
    .in("question_id", qids)
    .in("user_id", studentIds)
    .order("created_at", { ascending: true })
    .limit(CAP);

  const attemptRows = attempts ?? [];

  const userPaperQ = new Map<string, Set<string>>();
  for (const att of attemptRows) {
    const pid = qPaper.get(att.question_id as string);
    if (!pid) continue;
    const uid = att.user_id as string;
    const k = `${uid}:${pid}`;
    if (!userPaperQ.has(k)) userPaperQ.set(k, new Set());
    userPaperQ.get(k)!.add(att.question_id as string);
  }

  const assignmentFunnel = assignmentRows.slice(0, CAP).map((a) => {
    const assigned = memberRows.filter((m) => m.class_id === a.class_id).length;
    const qlist = questionsByPaper[a.paper_id] ?? [];
    const classStudents = memberRows.filter((m) => m.class_id === a.class_id).map((m) => m.student_id);
    let attempted = 0;
    let completed = 0;
    for (const uid of classStudents) {
      const set = userPaperQ.get(`${uid}:${a.paper_id}`);
      if (!set || set.size === 0) continue;
      attempted += 1;
      if (qlist.length > 0 && set.size >= qlist.length) completed += 1;
    }
    return {
      assignmentId: a.id,
      title: a.title,
      assigned,
      attempted,
      completed,
    };
  });

  const classComparison = classList.map((c) => {
    const rel = attemptRows.filter((att) => {
      const pid = qPaper.get(att.question_id as string);
      if (!pid) return false;
      const asn = assignmentRows.find((x) => x.paper_id === pid && x.class_id === c.id);
      if (!asn) return false;
      return memberRows.some((m) => m.class_id === c.id && m.student_id === att.user_id);
    });
    const avg =
      rel.length > 0 ? rel.reduce((s, x) => s + Number(x.percentage), 0) / rel.length : null;
    return {
      classId: c.id,
      className: c.name,
      avgPercentage: avg != null ? Math.round(avg * 10) / 10 : null,
      attempts: rel.length,
      students: memberRows.filter((m) => m.class_id === c.id).length,
    };
  });

  const topicMap = new Map<string, { sum: number; n: number; classId: string; topic: string }>();
  for (const att of attemptRows) {
    const topic = qTopic.get(att.question_id as string) ?? "Uncategorized";
    const pid = qPaper.get(att.question_id as string);
    if (!pid) continue;
    const asn = assignmentRows.find((x) => x.paper_id === pid);
    if (!asn) continue;
    const key = `${asn.class_id}\t${topic}`;
    const cur = topicMap.get(key) ?? { sum: 0, n: 0, classId: asn.class_id, topic };
    cur.sum += Number(att.percentage);
    cur.n += 1;
    topicMap.set(key, cur);
  }
  const topicMastery = [...topicMap.values()].slice(0, CAP).map((v) => {
    return {
      topic: v.topic,
      avgPercentage: v.n ? Math.round((v.sum / v.n) * 10) / 10 : 0,
      attempts: v.n,
      classId: v.classId,
      className: classNameById[v.classId] ?? "",
    };
  });

  const diffMap = new Map<string, { count: number; sum: number }>();
  for (const att of attemptRows) {
    const d = (qDiff.get(att.question_id as string) as "easy" | "medium" | "hard") || "medium";
    const cur = diffMap.get(d) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += Number(att.percentage);
    diffMap.set(d, cur);
  }
  const difficultyMix = ["easy", "medium", "hard"].map((difficulty) => {
    const cur = diffMap.get(difficulty) ?? { count: 0, sum: 0 };
    return {
      difficulty: difficulty as "easy" | "medium" | "hard",
      count: cur.count,
      avgPercentage: cur.count ? Math.round((cur.sum / cur.count) * 10) / 10 : 0,
    };
  });

  const engagementMap = new Map<string, { active: Set<string>; attempts: number }>();
  const cutoff = since28.toISOString();
  for (const att of attemptRows) {
    const created = att.created_at as string;
    if (created < cutoff) continue;
    const day = created.slice(0, 10);
    const cur = engagementMap.get(day) ?? { active: new Set<string>(), attempts: 0 };
    cur.active.add(att.user_id as string);
    cur.attempts += 1;
    engagementMap.set(day, cur);
  }
  const engagement = [...engagementMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      day,
      activeStudents: v.active.size,
      attempts: v.attempts,
    }));

  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({ hour, attempts: 0 }));
  for (const att of attemptRows) {
    const h = new Date(att.created_at as string).getHours();
    hourBuckets[h].attempts += 1;
  }

  const xpCutoff = since30.toISOString();
  const cohortXp = classList.map((c) => {
    const classStudents = new Set(memberRows.filter((m) => m.class_id === c.id).map((m) => m.student_id));
    const papersForClass = new Set(assignmentRows.filter((a) => a.class_id === c.id).map((a) => a.paper_id));
    let xp = 0;
    for (const att of attemptRows) {
      if (!classStudents.has(att.user_id as string)) continue;
      const pid = qPaper.get(att.question_id as string);
      if (!pid || !papersForClass.has(pid)) continue;
      if ((att.created_at as string) < xpCutoff) continue;
      xp += Number(att.xp_earned ?? 0);
    }
    const n = classStudents.size || 1;
    return {
      classId: c.id,
      className: c.name,
      xpLast30: xp,
      xpPerStudent: Math.round((xp / n) * 10) / 10,
    };
  });

  const studentAttemptCounts = new Map<string, number>();
  for (const att of attemptRows) {
    studentAttemptCounts.set(
      att.user_id as string,
      (studentAttemptCounts.get(att.user_id as string) ?? 0) + 1
    );
  }
  const topStudents = [...studentAttemptCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const { data: profs } =
    topStudents.length > 0
      ? await supabaseAdmin.from("profiles").select("id, username, full_name").in("id", topStudents)
      : { data: [] as { id: string; username: string | null; full_name: string | null }[] };

  const labelById = Object.fromEntries(
    (profs ?? []).map((p) => [
      p.id,
      ((p.full_name as string | null) || (p.username as string | null) || p.id) as string,
    ])
  );

  const perStudentTrajectory = topStudents.map((studentId) => {
    const points = attemptRows
      .filter((a) => a.user_id === studentId)
      .map((a) => ({
        date: (a.created_at as string).slice(0, 10),
        percentage: Math.round(Number(a.percentage) * 10) / 10,
      }));
    return {
      studentId,
      studentLabel: labelById[studentId] ?? studentId,
      points,
    };
  });

  return NextResponse.json({
    perStudentTrajectory,
    topicMastery,
    difficultyMix,
    assignmentFunnel,
    engagement,
    timeOfDay: hourBuckets,
    classComparison,
    cohortXp,
  });
}
