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
          { error: "Answer image exceeds the 8 MB limit." },
          { status: 413 }
        );
      }

      let mimeType = downloadedImage.type || "application/octet-stream";
      if (mimeType === "application/octet-stream") {
        const lowerPath = answerImagePath.toLowerCase();
        if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) mimeType = "image/jpeg";
        if (lowerPath.endsWith(".png")) mimeType = "image/png";
        if (lowerPath.endsWith(".webp")) mimeType = "image/webp";
      }
      const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowedMimeTypes.has(mimeType)) {
        return NextResponse.json(
          { error: "Unsupported image type. Please use JPG, PNG, or WEBP." },
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
      .select("xp, study_streak, last_study_date")
      .eq("id", auth.userId)
      .single();

    const currentXp: number = profile?.xp ?? 0;
    const currentStreak: number = profile?.study_streak ?? 0;
    const lastStudyDate: string | null = profile?.last_study_date ?? null;

    const today = new Date().toISOString().split("T")[0]!;
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0]!;

    let newStreak = currentStreak;

    if (lastStudyDate === today) {
      // no streak change
    } else if (lastStudyDate === yesterdayStr) {
      newStreak = currentStreak + 1;
      if (newStreak === 3) xpEarned += 50;
      if (newStreak === 7) xpEarned += 150;
    } else {
      newStreak = 1;
    }

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

    await supabaseAdmin
      .from("profiles")
      .update({
        xp: currentXp + xpEarned,
        study_streak: newStreak,
        last_study_date: today,
      })
      .eq("id", auth.userId);

    let answerImageUrl: string | null = null;
    if (answerImagePath) {
      const { data: signedData } = await supabaseAdmin.storage
        .from("answer-images")
        .createSignedUrl(answerImagePath, 3600);
      answerImageUrl = signedData?.signedUrl ?? null;
    }

    return NextResponse.json({
      score: clampedScore,
      maxScore,
      percentage,
      feedback: marking.feedback,
      strengths: marking.strengths,
      improvements: marking.improvements,
      modelAnswer: marking.model_answer,
      xpEarned,
      newStreak,
      paperCompleted,
      answerText,
      answerImagePath,
      answerImageUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
