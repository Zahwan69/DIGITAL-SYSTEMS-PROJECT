import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ assignmentId: string }> };

type AttemptRow = {
  id: string;
  user_id: string;
  question_id: string;
  answer_text: string | null;
  answer_image_url: string | null;
  answer_image_path: string | null;
  needs_teacher_review: boolean | null;
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  strengths: string[] | null;
  improvements: string[] | null;
  model_answer: string;
  created_at: string;
};

function label(profile: { username: string | null; full_name: string | null } | undefined) {
  return profile?.full_name || profile?.username || "Student";
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireTeacher(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { assignmentId } = await params;
  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select("id, class_id, paper_id, title, due_date, created_at")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const { data: classRow, error: classError } = await supabaseAdmin
    .from("classes")
    .select("id, name, teacher_id")
    .eq("id", assignment.class_id)
    .single();

  if (classError || !classRow) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }
  if (classRow.teacher_id !== auth.userId) {
    return new NextResponse(null, { status: 403 });
  }

  const [{ data: members }, { data: questions }, { data: paper }] = await Promise.all([
    supabaseAdmin.from("class_members").select("student_id").eq("class_id", assignment.class_id),
    supabaseAdmin
      .from("questions")
      .select("id, question_number, question_text, topic, marks_available, difficulty")
      .eq("paper_id", assignment.paper_id)
      .order("question_number", { ascending: true }),
    supabaseAdmin
      .from("past_papers")
      .select("id, subject_name, syllabus_code, year, paper_number")
      .eq("id", assignment.paper_id)
      .maybeSingle(),
  ]);

  const studentIds = (members ?? []).map((member) => member.student_id);
  const questionRows = questions ?? [];
  const questionIds = questionRows.map((question) => question.id);

  if (studentIds.length === 0 || questionIds.length === 0) {
    return NextResponse.json({
      assignment: {
        ...assignment,
        class_name: classRow.name,
        paper,
      },
      attempts: [],
    });
  }

  const [{ data: attemptRows }, { data: profiles }] = await Promise.all([
    supabaseAdmin
      .from("attempts")
      .select(
        "id, user_id, question_id, answer_text, answer_image_url, answer_image_path, needs_teacher_review, score, max_score, percentage, feedback, strengths, improvements, model_answer, created_at"
      )
      .in("question_id", questionIds)
      .in("user_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.from("profiles").select("id, username, full_name").in("id", studentIds),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      { username: profile.username as string | null, full_name: profile.full_name as string | null },
    ])
  );
  const questionById = new Map(questionRows.map((question) => [question.id, question]));

  const attempts = await Promise.all(
    ((attemptRows ?? []) as AttemptRow[]).map(async (attempt) => {
      const question = questionById.get(attempt.question_id);
      let answerImageUrl = attempt.answer_image_url;
      if (!answerImageUrl && attempt.answer_image_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("answer-images")
          .createSignedUrl(attempt.answer_image_path, 60 * 60);
        answerImageUrl = signed?.signedUrl ?? null;
      }

      return {
        id: attempt.id,
        student_id: attempt.user_id,
        student_name: label(profileById.get(attempt.user_id)),
        question: {
          id: attempt.question_id,
          question_number: question?.question_number ?? "?",
          question_text: question?.question_text ?? "",
          topic: question?.topic ?? null,
          marks_available: question?.marks_available ?? attempt.max_score,
          difficulty: question?.difficulty ?? null,
        },
        answer_text: attempt.answer_text ?? "",
        answer_image_url: answerImageUrl,
        needs_teacher_review: Boolean(attempt.needs_teacher_review || attempt.answer_image_path),
        score: attempt.score,
        max_score: attempt.max_score,
        percentage: attempt.percentage,
        feedback: attempt.feedback,
        strengths: attempt.strengths ?? [],
        improvements: attempt.improvements ?? [],
        model_answer: attempt.model_answer,
        created_at: attempt.created_at,
      };
    })
  );

  return NextResponse.json({
    assignment: {
      ...assignment,
      class_name: classRow.name,
      paper,
    },
    attempts,
  });
}
