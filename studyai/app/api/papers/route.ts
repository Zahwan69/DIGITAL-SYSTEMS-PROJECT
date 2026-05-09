import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaperRow = {
  id: string;
  subject_name: string;
  syllabus_code: string;
  year: number | null;
  level: string;
  question_count: number | null;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  class_id: string;
  paper_id: string;
  title: string;
  due_date: string | null;
  created_at: string;
};

type QuestionRow = {
  id: string;
  paper_id: string;
  question_number: string;
};

type AttemptRow = {
  id: string;
  question_id: string;
  score: number;
  max_score: number;
  percentage: number;
  created_at: string;
};

function summarizeAttempts(
  paperId: string,
  questionsByPaper: Record<string, QuestionRow[]>,
  attemptsByQuestion: Record<string, AttemptRow[]>
) {
  const questions = questionsByPaper[paperId] ?? [];
  const latestAttempts = questions
    .map((question) => attemptsByQuestion[question.id]?.[0])
    .filter((attempt): attempt is AttemptRow => Boolean(attempt));
  const allAttempts = questions
    .flatMap((question) =>
      (attemptsByQuestion[question.id] ?? []).map((attempt) => ({
        ...attempt,
        question_number: question.question_number,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const score = latestAttempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);
  const maxScore = latestAttempts.reduce((sum, attempt) => sum + (attempt.max_score ?? 0), 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : null;

  return {
    attemptedQuestions: latestAttempts.length,
    totalQuestions: questions.length,
    score,
    maxScore,
    percentage,
    lastAttemptedAt: allAttempts[0]?.created_at ?? null,
    attempts: allAttempts.slice(0, 8).map((attempt) => ({
      id: attempt.id,
      questionNumber: attempt.question_number,
      score: attempt.score,
      maxScore: attempt.max_score,
      percentage: attempt.percentage,
      createdAt: attempt.created_at,
    })),
  };
}

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

  const classIds = (memberships ?? []).map((membership) => membership.class_id);

  const [assignmentsResult, classesResult, uploadedResult] = await Promise.all([
    classIds.length
      ? supabaseAdmin
          .from("assignments")
          .select("id, class_id, paper_id, title, due_date, created_at")
          .in("class_id", classIds)
      : Promise.resolve({ data: [] as AssignmentRow[], error: null }),
    classIds.length
      ? supabaseAdmin.from("classes").select("id, name").in("id", classIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    supabaseAdmin
      .from("past_papers")
      .select("id, subject_name, syllabus_code, year, level, question_count, created_at")
      .eq("uploaded_by", auth.userId)
      .order("created_at", { ascending: false }),
  ]);

  if (assignmentsResult.error) {
    return NextResponse.json({ error: assignmentsResult.error.message }, { status: 500 });
  }
  if (classesResult.error) {
    return NextResponse.json({ error: classesResult.error.message }, { status: 500 });
  }
  if (uploadedResult.error) {
    return NextResponse.json({ error: uploadedResult.error.message }, { status: 500 });
  }

  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[];
  const uploadedPapers = (uploadedResult.data ?? []) as PaperRow[];
  const classNames = (classesResult.data ?? []).reduce<Record<string, string>>(
    (acc, row) => {
      acc[row.id] = row.name;
      return acc;
    },
    {}
  );

  const paperIds = Array.from(
    new Set([
      ...assignments.map((assignment) => assignment.paper_id),
      ...uploadedPapers.map((paper) => paper.id),
    ])
  );

  const assignedPaperIds = Array.from(new Set(assignments.map((assignment) => assignment.paper_id)));
  const assignedPapersResult = assignedPaperIds.length
    ? await supabaseAdmin
        .from("past_papers")
        .select("id, subject_name, syllabus_code, year, level, question_count, created_at")
        .in("id", assignedPaperIds)
    : { data: [] as PaperRow[], error: null };

  if (assignedPapersResult.error) {
    return NextResponse.json({ error: assignedPapersResult.error.message }, { status: 500 });
  }

  const papersById = [...((assignedPapersResult.data ?? []) as PaperRow[]), ...uploadedPapers].reduce<
    Record<string, PaperRow>
  >((acc, paper) => {
    acc[paper.id] = paper;
    return acc;
  }, {});

  let questionsByPaper: Record<string, QuestionRow[]> = {};
  let attemptsByQuestion: Record<string, AttemptRow[]> = {};

  if (paperIds.length > 0) {
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select("id, paper_id, question_number")
      .in("paper_id", paperIds);

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    questionsByPaper = ((questions ?? []) as QuestionRow[]).reduce<Record<string, QuestionRow[]>>(
      (acc, question) => {
        if (!acc[question.paper_id]) acc[question.paper_id] = [];
        acc[question.paper_id]!.push(question);
        return acc;
      },
      {}
    );

    const questionIds = (questions ?? []).map((question) => question.id);
    if (questionIds.length > 0) {
      const { data: attempts, error: attemptsError } = await supabaseAdmin
        .from("attempts")
        .select("id, question_id, score, max_score, percentage, created_at")
        .eq("user_id", auth.userId)
        .in("question_id", questionIds)
        .order("created_at", { ascending: false });

      if (attemptsError) {
        return NextResponse.json({ error: attemptsError.message }, { status: 500 });
      }

      attemptsByQuestion = ((attempts ?? []) as AttemptRow[]).reduce<
        Record<string, AttemptRow[]>
      >((acc, attempt) => {
        if (!acc[attempt.question_id]) acc[attempt.question_id] = [];
        acc[attempt.question_id]!.push(attempt);
        return acc;
      }, {});
    }
  }

  const assignedPapers = assignments
    .map((assignment) => {
      const paper = papersById[assignment.paper_id];
      if (!paper) return null;
      const summary = summarizeAttempts(paper.id, questionsByPaper, attemptsByQuestion);
      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        classId: assignment.class_id,
        className: classNames[assignment.class_id] ?? "Class",
        dueDate: assignment.due_date,
        assignedAt: assignment.created_at,
        paper,
        summary,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => {
      const classCompare = a.className.localeCompare(b.className);
      if (classCompare !== 0) return classCompare;
      return a.assignmentTitle.localeCompare(b.assignmentTitle);
    });

  const uploaded = uploadedPapers.map((paper) => ({
    paper,
    summary: summarizeAttempts(paper.id, questionsByPaper, attemptsByQuestion),
  }));

  return NextResponse.json({
    assignedPapers,
    uploadedPapers: uploaded,
  });
}
