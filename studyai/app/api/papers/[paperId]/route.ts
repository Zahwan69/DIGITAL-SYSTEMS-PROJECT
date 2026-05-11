import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaperRow = {
  id: string;
  uploaded_by: string;
  subject_name: string;
  syllabus_code: string;
  year: number | null;
  paper_number: string | null;
  level: string;
  question_count: number;
  created_at: string;
  file_url: string | null;
};

type QuestionRow = {
  id: string;
  question_number: string;
  question_text: string;
  topic: string | null;
  marks_available: number;
  difficulty: "easy" | "medium" | "hard";
  image_url: string | null;
  has_diagram: boolean;
  page_start: number | null;
  page_end: number | null;
};

type AttemptRow = {
  id: string;
  question_id: string;
  answer_text: string | null;
  answer_image_path: string | null;
  needs_teacher_review: boolean | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  feedback: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  model_answer: string | null;
  xp_earned: number | null;
  created_at: string;
};

const questionNumberSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

async function canAccessAssignedPaper(userId: string, paperId: string) {
  const { data: memberships, error: memberError } = await supabaseAdmin
    .from("class_members")
    .select("class_id")
    .eq("student_id", userId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  const classIds = (memberships ?? []).map((membership) => membership.class_id);
  if (classIds.length === 0) return false;

  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select("id")
    .eq("paper_id", paperId)
    .in("class_id", classIds)
    .limit(1);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  return Boolean(assignments?.length);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { paperId } = await params;

  const { data: paper, error: paperError } = await supabaseAdmin
    .from("past_papers")
    .select(
      "id, uploaded_by, subject_name, syllabus_code, year, paper_number, level, question_count, created_at, file_url"
    )
    .eq("id", paperId)
    .maybeSingle<PaperRow>();

  if (paperError) {
    return NextResponse.json({ error: paperError.message }, { status: 500 });
  }

  if (!paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", auth.userId)
    .maybeSingle();

  const isUploader = paper.uploaded_by === auth.userId;
  const isAdmin = profile?.role === "admin";
  let hasAssignmentAccess = false;

  if (!isUploader && !isAdmin) {
    try {
      hasAssignmentAccess = await canAccessAssignedPaper(auth.userId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check assignment access.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!isUploader && !isAdmin && !hasAssignmentAccess) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  let originalPdfUrl: string | null = null;
  if (paper.file_url) {
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("question-papers")
      .createSignedUrl(paper.file_url, 60 * 60);
    if (signedError) {
      console.warn(
        `[papers] could not sign question-paper URL for ${paperId}: ${signedError.message}`
      );
    } else {
      originalPdfUrl = signed?.signedUrl ?? null;
    }
  }

  const safePaper = {
    id: paper.id,
    subject_name: paper.subject_name,
    syllabus_code: paper.syllabus_code,
    year: paper.year,
    paper_number: paper.paper_number,
    level: paper.level,
    question_count: paper.question_count,
    created_at: paper.created_at,
    original_pdf_url: originalPdfUrl,
  };

  const { data: questionData, error: questionError } = await supabaseAdmin
    .from("questions")
    .select(
      "id, question_number, question_text, topic, marks_available, difficulty, image_url, has_diagram, page_start, page_end"
    )
    .eq("paper_id", paperId)
    .order("question_number", { ascending: true });

  if (questionError) {
    return NextResponse.json({ error: questionError.message }, { status: 500 });
  }

  const questions = ((questionData ?? []) as QuestionRow[]).sort((a, b) =>
    questionNumberSorter.compare(a.question_number, b.question_number)
  );
  const questionIds = questions.map((question) => question.id);
  const results: Record<string, unknown> = {};
  const pastAttempts: Record<string, unknown[]> = {};

  if (questionIds.length > 0) {
    const { data: attemptsData, error: attemptsError } = await supabaseAdmin
      .from("attempts")
      .select(
        "id, question_id, answer_text, answer_image_path, needs_teacher_review, score, max_score, percentage, feedback, strengths, improvements, model_answer, xp_earned, created_at"
      )
      .eq("user_id", auth.userId)
      .in("question_id", questionIds)
      .order("created_at", { ascending: false });

    if (attemptsError) {
      return NextResponse.json({ error: attemptsError.message }, { status: 500 });
    }

    const attempts = (attemptsData ?? []) as AttemptRow[];
    const signedUrlByPath = new Map<string, string>();

    for (const attempt of attempts) {
      if (!attempt.answer_image_path || signedUrlByPath.has(attempt.answer_image_path)) {
        continue;
      }
      const { data: signedData } = await supabaseAdmin.storage
        .from("answer-images")
        .createSignedUrl(attempt.answer_image_path, 3600);
      if (signedData?.signedUrl) {
        signedUrlByPath.set(attempt.answer_image_path, signedData.signedUrl);
      }
    }

    for (const attempt of attempts) {
      if (!pastAttempts[attempt.question_id]) pastAttempts[attempt.question_id] = [];
      pastAttempts[attempt.question_id].push({
        id: attempt.id,
        score: attempt.score ?? 0,
        max_score: attempt.max_score ?? 0,
        percentage: attempt.percentage ?? 0,
        feedback: attempt.feedback ?? "",
        created_at: attempt.created_at,
      });

      if (results[attempt.question_id]) continue;
      results[attempt.question_id] = {
        score: attempt.score ?? 0,
        maxScore: attempt.max_score ?? 0,
        percentage: attempt.percentage ?? 0,
        feedback: attempt.feedback ?? "",
        strengths: attempt.strengths ?? [],
        improvements: attempt.improvements ?? [],
        modelAnswer: attempt.model_answer ?? "",
        xpEarned: attempt.xp_earned ?? 0,
        newStreak: 1,
        answerText: attempt.answer_text ?? "",
        answerImagePath: attempt.answer_image_path,
        answerImageUrl: attempt.answer_image_path
          ? signedUrlByPath.get(attempt.answer_image_path) ?? null
          : null,
        needsTeacherReview: attempt.needs_teacher_review ?? Boolean(attempt.answer_image_path),
      };
    }
  }

  return NextResponse.json({
    paper: safePaper,
    questions,
    results,
    pastAttempts,
  });
}
