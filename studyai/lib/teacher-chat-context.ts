import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ClassSnapshot = {
  class: { id: string; name: string; subject?: { name: string; code: string | null; level: string | null } };
  generatedAt: string;
  windowDays: 30;
  roster: Array<{ studentLabel: string; xpTotal: number; xpLast30: number; lastActive: string | null }>;
  attemptsSummary: { total30d: number; avgPercentage: number; activeStudents30d: number; needsTeacherReview30d: number };
  perStudent: Array<{ studentLabel: string; attempts30d: number; avgPercentage: number; topWeakTopic?: string }>;
  topicMastery: Array<{ topic: string; attempts: number; avgPercentage: number }>;
  difficultyMix: Array<{ difficulty: "easy" | "medium" | "hard"; attempts: number; avgPercentage: number }>;
  assignments: Array<{ title: string; dueAt: string | null; assigned: number; attempted: number; completed: number }>;
  recentActivity: Array<{ studentLabel: string; assignmentOrPaper: string; percentage: number; at: string; needsTeacherReview: boolean }>;
  recentAttemptDetails: Array<{
    studentLabel: string;
    assignmentOrPaper: string;
    questionNumber: string;
    topic: string | null;
    questionText: string;
    answerText: string;
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    improvements: string[];
    at: string;
    needsTeacherReview: boolean;
  }>;
};

function studentLabel(profile: { username?: string | null; full_name?: string | null }) {
  const source = profile.full_name || profile.username || "Student";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
  return parts[0] || "Student";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function buildClassSnapshot(classId: string, teacherId: string): Promise<ClassSnapshot> {
  const generatedAt = new Date().toISOString();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: classRow, error: classError } = await supabaseAdmin
    .from("classes")
    .select("id, name, subject_id, subjects(name, syllabus_code, level)")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .single();

  if (classError || !classRow) {
    throw new Error(classError?.message ?? "Class not found.");
  }

  const { data: members } = await supabaseAdmin
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId)
    .limit(200);

  const studentIds = (members ?? []).map((member) => member.student_id);
  const { data: profiles } =
    studentIds.length > 0
      ? await supabaseAdmin.from("profiles").select("id, username, full_name, xp").in("id", studentIds).limit(200)
      : { data: [] };

  const labels = new Map((profiles ?? []).map((profile) => [profile.id, studentLabel(profile)]));
  const xpTotals = new Map((profiles ?? []).map((profile) => [profile.id, Number(profile.xp ?? 0)]));

  const { data: assignments } = await supabaseAdmin
    .from("assignments")
    .select("id, title, due_date, paper_id")
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(200);

  const paperIds = [...new Set((assignments ?? []).map((assignment) => assignment.paper_id).filter(Boolean))];
  const { data: questions } =
    paperIds.length > 0
      ? await supabaseAdmin
          .from("questions")
          .select("id, paper_id, question_number, question_text, topic, difficulty")
          .in("paper_id", paperIds)
          .limit(200)
      : { data: [] };

  const questionIds = (questions ?? []).map((question) => question.id);
  const questionById = new Map((questions ?? []).map((question) => [question.id, question]));
  const paperTitleById = new Map((assignments ?? []).map((assignment) => [assignment.paper_id, assignment.title]));

  const { data: attempts } =
    questionIds.length > 0 && studentIds.length > 0
      ? await supabaseAdmin
          .from("attempts")
          .select("id, user_id, question_id, answer_text, score, max_score, percentage, feedback, improvements, created_at, answer_image_path, needs_teacher_review")
          .in("question_id", questionIds)
          .in("user_id", studentIds)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] };

  const attemptRows = attempts ?? [];
  const percentages = attemptRows.map((attempt) => Number(attempt.percentage ?? 0));
  const attemptsByStudent = new Map<string, typeof attemptRows>();
  const topics = new Map<string, number[]>();
  const difficulties = new Map<"easy" | "medium" | "hard", number[]>();
  const lastActive = new Map<string, string>();

  for (const attempt of attemptRows) {
    const byStudent = attemptsByStudent.get(attempt.user_id) ?? [];
    byStudent.push(attempt);
    attemptsByStudent.set(attempt.user_id, byStudent);
    if (!lastActive.has(attempt.user_id)) lastActive.set(attempt.user_id, attempt.created_at);

    const question = questionById.get(attempt.question_id);
    if (question?.topic) {
      const values = topics.get(question.topic) ?? [];
      values.push(Number(attempt.percentage ?? 0));
      topics.set(question.topic, values);
    }
    if (question?.difficulty === "easy" || question?.difficulty === "medium" || question?.difficulty === "hard") {
      const values = difficulties.get(question.difficulty) ?? [];
      values.push(Number(attempt.percentage ?? 0));
      difficulties.set(question.difficulty, values);
    }
  }

  const roster = studentIds.map((id) => ({
    studentLabel: labels.get(id) ?? "Student",
    xpTotal: xpTotals.get(id) ?? 0,
    xpLast30: 0,
    lastActive: lastActive.get(id) ?? null,
  }));

  const perStudent = studentIds.map((id) => {
    const rows = attemptsByStudent.get(id) ?? [];
    const weakTopics = new Map<string, number[]>();
    for (const row of rows) {
      const topic = questionById.get(row.question_id)?.topic;
      if (!topic) continue;
      const values = weakTopics.get(topic) ?? [];
      values.push(Number(row.percentage ?? 0));
      weakTopics.set(topic, values);
    }
    const weakest = [...weakTopics.entries()].sort((a, b) => average(a[1]) - average(b[1]))[0]?.[0];
    return {
      studentLabel: labels.get(id) ?? "Student",
      attempts30d: rows.length,
      avgPercentage: average(rows.map((row) => Number(row.percentage ?? 0))),
      ...(weakest ? { topWeakTopic: weakest } : {}),
    };
  });

  const assignmentRows = (assignments ?? []).map((assignment) => {
    const qids = (questions ?? []).filter((question) => question.paper_id === assignment.paper_id).map((question) => question.id);
    const rows = attemptRows.filter((attempt) => qids.includes(attempt.question_id));
    return {
      title: assignment.title,
      dueAt: assignment.due_date ?? null,
      assigned: studentIds.length,
      attempted: new Set(rows.map((row) => row.user_id)).size,
      completed: new Set(rows.filter((row) => Number(row.percentage ?? 0) >= 50).map((row) => row.user_id)).size,
    };
  });

  const subject = firstRelation(classRow.subjects);

  return {
    class: {
      id: classRow.id,
      name: classRow.name,
      ...(subject
        ? { subject: { name: subject.name, code: subject.syllabus_code ?? null, level: subject.level ?? null } }
        : {}),
    },
    generatedAt,
    windowDays: 30,
    roster,
    attemptsSummary: {
      total30d: attemptRows.length,
      avgPercentage: average(percentages),
      activeStudents30d: new Set(attemptRows.map((attempt) => attempt.user_id)).size,
      needsTeacherReview30d: attemptRows.filter((attempt) =>
        Boolean(attempt.needs_teacher_review || attempt.answer_image_path)
      ).length,
    },
    perStudent,
    topicMastery: [...topics.entries()].map(([topic, values]) => ({
      topic,
      attempts: values.length,
      avgPercentage: average(values),
    })),
    difficultyMix: [...difficulties.entries()].map(([difficulty, values]) => ({
      difficulty,
      attempts: values.length,
      avgPercentage: average(values),
    })),
    assignments: assignmentRows,
    recentActivity: attemptRows.slice(0, 25).map((attempt) => {
      const question = questionById.get(attempt.question_id);
      return {
        studentLabel: labels.get(attempt.user_id) ?? "Student",
        assignmentOrPaper: question ? paperTitleById.get(question.paper_id) ?? "Paper" : "Paper",
        percentage: Number(attempt.percentage ?? 0),
        at: attempt.created_at,
        needsTeacherReview: Boolean(attempt.needs_teacher_review || attempt.answer_image_path),
      };
    }),
    recentAttemptDetails: attemptRows.slice(0, 20).map((attempt) => {
      const question = questionById.get(attempt.question_id);
      return {
        studentLabel: labels.get(attempt.user_id) ?? "Student",
        assignmentOrPaper: question ? paperTitleById.get(question.paper_id) ?? "Paper" : "Paper",
        questionNumber: String(question?.question_number ?? "?"),
        topic: question?.topic ?? null,
        questionText: String(question?.question_text ?? "").slice(0, 500),
        answerText: String(attempt.answer_text ?? "").slice(0, 500),
        score: Number(attempt.score ?? 0),
        maxScore: Number(attempt.max_score ?? 0),
        percentage: Number(attempt.percentage ?? 0),
        feedback: String(attempt.feedback ?? "").slice(0, 500),
        improvements: Array.isArray(attempt.improvements)
          ? attempt.improvements.map(String).slice(0, 4)
          : [],
        at: attempt.created_at,
        needsTeacherReview: Boolean(attempt.needs_teacher_review || attempt.answer_image_path),
      };
    }),
  };
}
