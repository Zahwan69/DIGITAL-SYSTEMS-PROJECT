import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateGeminiContent } from "@/lib/gemini";
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
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as {
      questionId?: string;
      answerText?: string;
    };

    const questionId = body.questionId?.trim();
    const answerText = body.answerText?.trim();

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required." }, { status: 400 });
    }
    if (!answerText || answerText.length === 0) {
      return NextResponse.json({ error: "answerText is required." }, { status: 400 });
    }

    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, marks_available, marking_scheme")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const maxScore: number = question.marks_available ?? 0;

    const markingSchemeSection = question.marking_scheme
      ? `Marking scheme:\n${question.marking_scheme}`
      : "Marking scheme: Not provided — use your knowledge of Cambridge mark schemes.";

    const prompt = `You are a Cambridge examiner. Mark the student's answer strictly and fairly.

Question: ${question.question_text}
Marks available: ${maxScore}
${markingSchemeSection}

Student's answer:
${answerText}

Return ONLY valid JSON with no markdown fences:
{
  "score": <integer between 0 and ${maxScore}>,
  "feedback": "<2-3 sentence overall comment on the answer>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "model_answer": "<a complete model answer a top student would write>"
}`;

    const { result } = await generateGeminiContent([{ text: prompt }]);
    const marking = parseMarkingResult(result.response.text());

    const clampedScore = Math.max(0, Math.min(marking.score, maxScore));
    const percentage = maxScore > 0 ? Math.round((clampedScore / maxScore) * 100) : 0;

    let xpEarned = 10;
    if (clampedScore === maxScore && maxScore > 0) {
      xpEarned += 25;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("xp, study_streak, last_study_date")
      .eq("id", user.id)
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

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .insert({
        user_id: user.id,
        question_id: questionId,
        answer_text: answerText,
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

    await supabaseAdmin
      .from("profiles")
      .update({
        xp: currentXp + xpEarned,
        study_streak: newStreak,
        last_study_date: today,
      })
      .eq("id", user.id);

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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
