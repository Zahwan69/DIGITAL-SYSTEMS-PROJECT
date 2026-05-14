import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { markAnswer } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";

type MarkingResult = {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  model_answer: string;
};

type LooseMarkingResult = {
  score?: number | string;
  feedback?: string;
  strengths?: unknown;
  improvements?: unknown;
  model_answer?: string;
  modelAnswer?: string;
};

function parseMarkingResult(raw: string): MarkingResult {
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed: LooseMarkingResult;
  try {
    parsed = JSON.parse(clean) as LooseMarkingResult;
  } catch {
    throw new Error("Gemini did not return valid JSON.");
  }

  const score =
    typeof parsed.score === "number"
      ? parsed.score
      : parseInt(String(parsed.score ?? "0"), 10);

  const toStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === "string" && value.length > 0) return [value];
    return [];
  };

  return {
    score: Number.isFinite(score) ? score : 0,
    feedback: parsed.feedback?.trim() ?? "No feedback provided.",
    strengths: toStringArray(parsed.strengths),
    improvements: toStringArray(parsed.improvements),
    model_answer:
      (parsed.model_answer ?? parsed.modelAnswer ?? "").trim() ||
      "No model answer provided.",
  };
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = (await request.json()) as {
      questionId?: string;
      answerText?: string;
      answerImagePath?: string;
    };

    const questionId = body.questionId?.trim();
    const answerText = body.answerText?.trim() ?? "";
    const answerImagePath = body.answerImagePath?.trim() || null;

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required." }, { status: 400 });
    }
    if (!answerText && !answerImagePath) {
      return NextResponse.json(
        { error: "Provide at least text or an image." },
        { status: 400 }
      );
    }

    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .select("id, paper_id, question_text, marks_available, marking_scheme")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const MAX_ATTEMPTS = 3;
    const { count: priorAttemptCount, error: priorAttemptError } = await supabaseAdmin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .eq("question_id", questionId);
    if (priorAttemptError) {
      return NextResponse.json({ error: priorAttemptError.message }, { status: 500 });
    }
    const attemptsBeforeInsert = priorAttemptCount ?? 0;
    if (attemptsBeforeInsert >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error: "Attempt limit reached for this question.",
          attemptsUsed: attemptsBeforeInsert,
          attemptsRemaining: 0,
        },
        { status: 409 }
      );
    }

    const maxScore: number = question.marks_available ?? 0;

    let answerImage: { mimeType: string; base64: string } | null = null;
    if (answerImagePath) {
      const ownerPrefix = answerImagePath.split("/")[0];
      if (!ownerPrefix || ownerPrefix !== auth.userId) {
        return NextResponse.json(
          { error: "You cannot use another student's uploaded image." },
          { status: 403 }
        );
      }

      const { data: downloadedImage, error: imageDownloadError } = await supabaseAdmin.storage
        .from("answer-images")
        .download(answerImagePath);
      if (imageDownloadError || !downloadedImage) {
        return NextResponse.json(
          { error: imageDownloadError?.message ?? "Answer image not found." },
          { status: 400 }
        );
      }

      const fileSize = downloadedImage.size;
      if (fileSize > 8 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Answer attachment exceeds the 8 MB limit." },
          { status: 413 }
        );
      }

      let mimeType = downloadedImage.type || "application/octet-stream";
      if (mimeType === "application/octet-stream") {
        const lowerPath = answerImagePath.toLowerCase();
        if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) mimeType = "image/jpeg";
        if (lowerPath.endsWith(".png")) mimeType = "image/png";
        if (lowerPath.endsWith(".webp")) mimeType = "image/webp";
        if (lowerPath.endsWith(".pdf")) mimeType = "application/pdf";
      }
      const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
      if (!allowedMimeTypes.has(mimeType)) {
        return NextResponse.json(
          { error: "Unsupported file type. Please use JPG, PNG, WEBP, or PDF." },
          { status: 415 }
        );
      }

      const imageBytes = await downloadedImage.arrayBuffer();
      answerImage = {
        mimeType,
        base64: Buffer.from(imageBytes).toString("base64"),
      };
    }

    let marking: MarkingResult;
    try {
      const markResponse = await markAnswer({
        questionText: question.question_text,
        markingScheme: question.marking_scheme,
        marksAvailable: maxScore,
        answerText,
        answerImage,
      });
      marking = parseMarkingResult(markResponse.text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini error";
      console.error(`[mark] Gemini marking failed: ${message}`);
      return NextResponse.json(
        { error: "Marking failed due to an AI processing issue. Please try again." },
        { status: 502 }
      );
    }

    const clampedScore = Math.max(0, Math.min(marking.score, maxScore));
    const percentage = maxScore > 0 ? Math.round((clampedScore / maxScore) * 100) : 0;

    let xpEarned = 10;
    if (clampedScore === maxScore && maxScore > 0) {
      xpEarned += 25;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("xp, level")
      .eq("id", auth.userId)
      .single();

    const currentXp: number = profile?.xp ?? 0;

    const { data: paperQuestions, error: paperQuestionsError } = await supabaseAdmin
      .from("questions")
      .select("id")
      .eq("paper_id", question.paper_id);
    if (paperQuestionsError || !paperQuestions) {
      return NextResponse.json(
        { error: paperQuestionsError?.message ?? "Failed to load paper questions." },
        { status: 500 }
      );
    }

    const paperQuestionIds = paperQuestions.map((q) => q.id);
    let answeredBeforeCount = 0;
    if (paperQuestionIds.length > 0) {
      const { data: attemptsBefore, error: attemptsBeforeError } = await supabaseAdmin
        .from("attempts")
        .select("question_id")
        .eq("user_id", auth.userId)
        .in("question_id", paperQuestionIds);

      if (attemptsBeforeError) {
        return NextResponse.json({ error: attemptsBeforeError.message }, { status: 500 });
      }

      answeredBeforeCount = new Set((attemptsBefore ?? []).map((a) => a.question_id)).size;
    }

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .insert({
        user_id: auth.userId,
        question_id: questionId,
        answer_text: answerText,
        answer_image_path: answerImagePath,
        answer_image_url: null,
        needs_teacher_review: Boolean(answerImagePath),
        score: clampedScore,
        max_score: maxScore,
        percentage,
        feedback: marking.feedback,
        strengths: marking.strengths,
        improvements: marking.improvements,
        model_answer: marking.model_answer,
        xp_earned: xpEarned,
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: attemptError?.message ?? "Failed to save attempt." },
        { status: 500 }
      );
    }

    let paperCompleted = false;
    const totalQuestionsInPaper = paperQuestionIds.length;
    if (totalQuestionsInPaper > 0) {
      const { data: attemptsAfter, error: attemptsAfterError } = await supabaseAdmin
        .from("attempts")
        .select("question_id")
        .eq("user_id", auth.userId)
        .in("question_id", paperQuestionIds);

      if (attemptsAfterError) {
        return NextResponse.json({ error: attemptsAfterError.message }, { status: 500 });
      }

      const answeredAfterCount = new Set((attemptsAfter ?? []).map((a) => a.question_id)).size;
      paperCompleted =
        answeredBeforeCount < totalQuestionsInPaper &&
        answeredAfterCount === totalQuestionsInPaper;
    }

    if (paperCompleted) {
      xpEarned += 100;
      const { error: attemptUpdateError } = await supabaseAdmin
        .from("attempts")
        .update({ xp_earned: xpEarned })
        .eq("id", attempt.id);

      if (attemptUpdateError) {
        return NextResponse.json({ error: attemptUpdateError.message }, { status: 500 });
      }
    }

    const newXp = currentXp + xpEarned;
    const newLevel = Math.floor(newXp / 500) + 1;

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        xp: newXp,
        level: newLevel,
      })
      .eq("id", auth.userId);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }

    let answerImageUrl: string | null = null;
    if (answerImagePath) {
      const { data: signedData } = await supabaseAdmin.storage
        .from("answer-images")
        .createSignedUrl(answerImagePath, 3600);
      answerImageUrl = signedData?.signedUrl ?? null;
    }

    const attemptsUsedAfter = attemptsBeforeInsert + 1;
    return NextResponse.json({
      score: clampedScore,
      maxScore,
      percentage,
      feedback: marking.feedback,
      strengths: marking.strengths,
      improvements: marking.improvements,
      modelAnswer: marking.model_answer,
      xpEarned,
      newStreak: 0,
      paperCompleted,
      answerText,
      answerImagePath,
      answerImageUrl,
      needsTeacherReview: Boolean(answerImagePath),
      attemptsUsed: attemptsUsedAfter,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attemptsUsedAfter),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
