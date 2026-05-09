import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AssignmentRow = {
  id: string;
  class_id: string;
  paper_id: string;
  title: string;
  due_date: string | null;
  created_at: string;
};

type MemberRow = {
  class_id: string;
  student_id: string;
};

type QuestionRow = {
  id: string;
  paper_id: string;
  question_number: string;
};

type AttemptRow = {
  id: string;
  user_id: string;
  question_id: string;
  score: number;
  max_score: number;
  percentage: number;
  created_at: string;
};

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

  const assignmentsRows = (rows ?? []) as AssignmentRow[];
  const paperIds = Array.from(new Set(assignmentsRows.map((row) => row.paper_id)));

  const [{ data: members }, { data: papers }, { data: questions }] = await Promise.all([
    supabaseAdmin
      .from("class_members")
      .select("class_id, student_id")
      .in("class_id", classIds),
    paperIds.length
      ? supabaseAdmin
          .from("past_papers")
          .select("id, subject_name, syllabus_code")
          .in("id", paperIds)
      : Promise.resolve({
          data: [] as { id: string; subject_name: string; syllabus_code: string }[],
        }),
    paperIds.length
      ? supabaseAdmin
          .from("questions")
          .select("id, paper_id, question_number")
          .in("paper_id", paperIds)
      : Promise.resolve({ data: [] as QuestionRow[] }),
  ]);

  const memberRows = (members ?? []) as MemberRow[];
  const studentIds = Array.from(new Set(memberRows.map((member) => member.student_id)));
  const questionRows = (questions ?? []) as QuestionRow[];
  const questionIds = questionRows.map((question) => question.id);

  const [{ data: attempts }, { data: profiles }] = await Promise.all([
    questionIds.length && studentIds.length
      ? supabaseAdmin
          .from("attempts")
          .select("id, user_id, question_id, score, max_score, percentage, created_at")
          .in("question_id", questionIds)
          .in("user_id", studentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AttemptRow[] }),
    studentIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id, username, full_name")
          .in("id", studentIds)
      : Promise.resolve({
          data: [] as { id: string; username: string | null; full_name: string | null }[],
        }),
  ]);

  const membersByClass = memberRows.reduce<Record<string, Set<string>>>((acc, member) => {
    if (!acc[member.class_id]) acc[member.class_id] = new Set();
    acc[member.class_id]!.add(member.student_id);
    return acc;
  }, {});

  const questionsByPaper = questionRows.reduce<Record<string, QuestionRow[]>>((acc, question) => {
    if (!acc[question.paper_id]) acc[question.paper_id] = [];
    acc[question.paper_id]!.push(question);
    return acc;
  }, {});

  const questionById = questionRows.reduce<Record<string, QuestionRow>>((acc, question) => {
    acc[question.id] = question;
    return acc;
  }, {});

  const paperById = (papers ?? []).reduce<
    Record<string, { subject_name: string; syllabus_code: string }>
  >((acc, paper) => {
    acc[paper.id] = {
      subject_name: paper.subject_name,
      syllabus_code: paper.syllabus_code,
    };
    return acc;
  }, {});

  const profileById = (profiles ?? []).reduce<
    Record<string, { username: string | null; full_name: string | null }>
  >((acc, profile) => {
    acc[profile.id] = {
      username: profile.username,
      full_name: profile.full_name,
    };
    return acc;
  }, {});

  const attemptRows = (attempts ?? []) as AttemptRow[];

  const assignments = assignmentsRows.map((r) => {
    const classMembers = membersByClass[r.class_id] ?? new Set<string>();
    const paperQuestions = questionsByPaper[r.paper_id] ?? [];
    const paperQuestionIds = new Set(paperQuestions.map((question) => question.id));
    const relevantAttempts = attemptRows.filter(
      (attempt) => classMembers.has(attempt.user_id) && paperQuestionIds.has(attempt.question_id)
    );
    const attemptedStudents = new Set(relevantAttempts.map((attempt) => attempt.user_id));
    const average =
      relevantAttempts.length > 0
        ? Math.round(
            (relevantAttempts.reduce((sum, attempt) => sum + Number(attempt.percentage), 0) /
              relevantAttempts.length) *
              10
          ) / 10
        : null;

    const recent_attempts = relevantAttempts.slice(0, 8).map((attempt) => {
      const profile = profileById[attempt.user_id];
      const question = questionById[attempt.question_id];
      return {
        id: attempt.id,
        student_name: profile?.full_name || profile?.username || "Student",
        question_number: question?.question_number ?? "?",
        score: attempt.score,
        max_score: attempt.max_score,
        percentage: attempt.percentage,
        created_at: attempt.created_at,
      };
    });

    return {
    ...r,
    class_name: className[r.class_id] ?? "Class",
      paper: paperById[r.paper_id] ?? null,
      attempt_summary: {
        member_count: classMembers.size,
        question_count: paperQuestions.length,
        attempted_student_count: attemptedStudents.size,
        attempt_count: relevantAttempts.length,
        average_percentage: average,
        recent_attempts,
      },
    };
  });

  return NextResponse.json({ assignments });
}
