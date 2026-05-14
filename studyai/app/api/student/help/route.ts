import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { resolvePaperAccess, isPaperAssignedToStudent } from "@/lib/assignment-access";
import { generateGeminiContent } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_ATTEMPTS = 3;

type Mode = "hint" | "explain" | "guide" | "check" | "feedback" | "reveal_answer";

type RequestBody = {
  questionId?: string;
  message?: string;
  mode?: Mode;
  currentDraftAnswer?: string;
  hintCount?: number;
};

type BlockedReason =
  | "assigned_paper_no_reveal"
  | "already_revealed"
  | "attempt_limit_exceeded";

type QuestionRow = {
  id: string;
  paper_id: string;
  question_number: string;
  question_text: string;
  topic: string | null;
  marks_available: number;
  difficulty: string;
  marking_scheme: string | null;
  page_start: number | null;
};

type PaperRow = {
  id: string;
  uploaded_by: string;
  subject_name: string;
  level: string;
  syllabus_code: string;
};

type AttemptRow = {
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  feedback: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  model_answer: string | null;
  answer_text: string | null;
  created_at: string;
};

type HelpUsageRow = {
  id: string;
  answer_revealed: boolean;
  answer_revealed_at: string | null;
};

const VALID_MODES: Mode[] = ["hint", "explain", "guide", "check", "feedback", "reveal_answer"];

function clampHintLevel(value: number | undefined): 1 | 2 | 3 {
  if (!Number.isFinite(value)) return 1;
  const v = Math.floor(value as number);
  if (v <= 1) return 1;
  if (v >= 3) return 3;
  return 2;
}

function buildPrompt(args: {
  mode: Mode;
  isAssigned: boolean;
  revealAllowedNow: boolean;
  alreadyRevealed: boolean;
  hintLevel: 1 | 2 | 3;
  message: string | null;
  draftAnswer: string | null;
  question: QuestionRow;
  paper: PaperRow;
  recentAttempt: AttemptRow | null;
  attemptsUsed: number;
  attemptsRemaining: number;
}): string {
  const {
    mode,
    isAssigned,
    revealAllowedNow,
    alreadyRevealed,
    hintLevel,
    message,
    draftAnswer,
    question,
    paper,
    recentAttempt,
    attemptsUsed,
    attemptsRemaining,
  } = args;

  const lines: string[] = [];

  lines.push(
    "You are StudyAI's student helper. Stay focused on the current exam question and StudyAI learning support only.",
    "Refuse unrelated chatter politely. Do not invent missing question details — if context is insufficient, say what is missing."
  );

  if (isAssigned) {
    lines.push(
      "RULES (TEACHER-ASSIGNED PRACTICE):",
      "- This question is part of teacher-assigned work.",
      "- Never reveal the final answer.",
      "- Never quote, paraphrase, or expose the mark scheme.",
      "- If the student asks for the answer, refuse briefly and offer a hint instead.",
      "- Hints, explanations of concepts, and guiding questions are allowed."
    );
  } else {
    lines.push(
      "RULES (SELF-PRACTICE):",
      "- Hints and explanations are allowed.",
      revealAllowedNow
        ? "- The server has granted a one-time reveal. You MAY share the model answer in full and explain it."
        : alreadyRevealed
          ? "- The answer has already been revealed earlier; do NOT reveal it again. Hints and feedback explanations only."
          : "- Do not reveal the final answer unless the server explicitly grants permission in this turn."
    );
  }

  if (mode === "hint") {
    if (hintLevel === 1) {
      lines.push(
        "HINT LEVEL 1: Give a gentle nudge — point the student to the relevant idea or what to look at. One or two short sentences. No method, no formula."
      );
    } else if (hintLevel === 2) {
      lines.push(
        "HINT LEVEL 2: Name the method, formula, or principle the student should use. Still do not solve the question."
      );
    } else {
      lines.push(
        "HINT LEVEL 3: Give step-by-step guidance the student can follow. Do not state the final numeric or textual answer."
      );
    }
  } else if (mode === "explain") {
    lines.push(
      "TASK: Explain the question in simpler words. Clarify what is being asked, what is given, and what kind of answer is expected. Do not solve it."
    );
  } else if (mode === "guide") {
    lines.push(
      "TASK: Walk the student through the approach step by step. Stop short of giving the final answer."
    );
  } else if (mode === "check") {
    lines.push(
      "TASK: Look at the student's current draft answer and tell them what is on track and what needs reconsideration. Do not give the final answer; ask questions that help them improve their own answer."
    );
  } else if (mode === "feedback") {
    lines.push(
      "TASK: Explain the AI marker's most recent feedback in plain language. Help the student understand why marks were lost or gained and how to improve next time. Do not reveal the model answer unless the server has explicitly granted reveal."
    );
  } else if (mode === "reveal_answer") {
    if (revealAllowedNow) {
      lines.push(
        "TASK: This is the granted one-time reveal. Present the model answer clearly and explain the reasoning so the student learns from it."
      );
    } else if (isAssigned) {
      lines.push(
        "TASK: The student asked for the answer, but this is teacher-assigned work. Say briefly: \"I can't reveal the full answer for assigned work, but I can give you a hint.\" Then give a level-1 hint."
      );
    } else if (alreadyRevealed) {
      lines.push(
        "TASK: The student asked for the answer, but they already revealed it for this question. Say briefly: \"You have already revealed the answer for this question. I can still give hints or explain your previous feedback.\" Then offer to clarify any part of the prior reveal."
      );
    }
  }

  lines.push(
    "",
    `Subject: ${paper.subject_name} (${paper.level}, ${paper.syllabus_code})`,
    `Question ${question.question_number} (${question.marks_available} mark${question.marks_available === 1 ? "" : "s"}, ${question.difficulty}${question.topic ? `, topic: ${question.topic}` : ""})`,
    "",
    "QUESTION TEXT:",
    question.question_text,
    ""
  );

  if (draftAnswer && draftAnswer.trim()) {
    lines.push("STUDENT'S CURRENT DRAFT:", draftAnswer.trim(), "");
  }

  if (recentAttempt && recentAttempt.feedback) {
    lines.push(
      "PRIOR AI FEEDBACK (most recent attempt):",
      `Score: ${recentAttempt.score ?? 0}/${recentAttempt.max_score ?? 0}`,
      `Feedback: ${recentAttempt.feedback}`,
      ""
    );
    if (recentAttempt.improvements?.length) {
      lines.push(`Improvements suggested: ${recentAttempt.improvements.join("; ")}`, "");
    }
  }

  if (
    mode === "reveal_answer" &&
    revealAllowedNow &&
    question.marking_scheme &&
    question.marking_scheme.trim()
  ) {
    lines.push("MARKING SCHEME (use to explain the model answer):", question.marking_scheme, "");
  }

  if (message && message.trim()) {
    lines.push("STUDENT MESSAGE:", message.trim(), "");
  }

  lines.push(
    `Attempts used: ${attemptsUsed}/${MAX_ATTEMPTS}. Attempts remaining: ${attemptsRemaining}.`,
    "",
    "Reply in plain prose only. No JSON, no markdown headings, no quotation of the mark scheme verbatim. Keep it concise (max ~6 sentences)."
  );

  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const questionId = body.questionId?.trim();
    const mode = (body.mode ?? "hint") as Mode;
    const message = body.message?.trim() ?? "";
    const draftAnswer = body.currentDraftAnswer?.trim() ?? "";
    const hintLevel = clampHintLevel(body.hintCount);

    if (!questionId) {
      return NextResponse.json({ error: "questionId is required." }, { status: 400 });
    }
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
    }

    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .select(
        "id, paper_id, question_number, question_text, topic, marks_available, difficulty, marking_scheme, page_start"
      )
      .eq("id", questionId)
      .maybeSingle<QuestionRow>();
    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 500 });
    }
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const { data: paper, error: paperError } = await supabaseAdmin
      .from("past_papers")
      .select("id, uploaded_by, subject_name, level, syllabus_code")
      .eq("id", question.paper_id)
      .maybeSingle<PaperRow>();
    if (paperError) {
      return NextResponse.json({ error: paperError.message }, { status: 500 });
    }
    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    let access;
    try {
      access = await resolvePaperAccess(auth.userId, paper);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "access check failed";
      return NextResponse.json({ error: errMessage }, { status: 500 });
    }
    if (!access.canRead) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    // Count attempts for this user+question.
    const { count: attemptCount, error: countError } = await supabaseAdmin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .eq("question_id", questionId);
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    const attemptsUsed = attemptCount ?? 0;
    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

    // Determine teacher-assigned vs self-practice strictly from the student side.
    const isAssigned = await isPaperAssignedToStudent(auth.userId, paper.id);

    // Load reveal usage.
    const { data: helpUsage, error: helpUsageError } = await supabaseAdmin
      .from("question_help_usage")
      .select("id, answer_revealed, answer_revealed_at")
      .eq("user_id", auth.userId)
      .eq("question_id", questionId)
      .maybeSingle<HelpUsageRow>();
    if (helpUsageError) {
      return NextResponse.json({ error: helpUsageError.message }, { status: 500 });
    }
    const alreadyRevealed = Boolean(helpUsage?.answer_revealed);

    // Decide whether reveal is permitted in this request.
    let blockedReason: BlockedReason | undefined;
    let revealAllowedNow = false;
    if (mode === "reveal_answer") {
      if (isAssigned) {
        blockedReason = "assigned_paper_no_reveal";
      } else if (alreadyRevealed) {
        blockedReason = "already_revealed";
      } else {
        revealAllowedNow = true;
      }
    }

    // Load most recent attempt for feedback explanation.
    const { data: recentAttemptData } = await supabaseAdmin
      .from("attempts")
      .select(
        "score, max_score, percentage, feedback, strengths, improvements, model_answer, answer_text, created_at"
      )
      .eq("user_id", auth.userId)
      .eq("question_id", questionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AttemptRow>();
    const recentAttempt = recentAttemptData ?? null;

    const prompt = buildPrompt({
      mode,
      isAssigned,
      revealAllowedNow,
      alreadyRevealed,
      hintLevel,
      message: message || null,
      draftAnswer: draftAnswer || null,
      question,
      paper,
      recentAttempt,
      attemptsUsed,
      attemptsRemaining,
    });

    let assistantMessage: string;
    try {
      const { result } = await generateGeminiContent([{ text: prompt }]);
      assistantMessage = result.response.text().trim();
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Helper generation failed.";
      return NextResponse.json({ error: errMessage }, { status: 502 });
    }

    // If a reveal was granted, persist usage AFTER the generation succeeded.
    let revealedNow = false;
    if (revealAllowedNow) {
      const nowIso = new Date().toISOString();
      const { error: upsertError } = await supabaseAdmin
        .from("question_help_usage")
        .upsert(
          {
            user_id: auth.userId,
            question_id: questionId,
            answer_revealed: true,
            answer_revealed_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "user_id,question_id" }
        );
      if (upsertError) {
        // Reveal generation worked but we couldn't persist — surface the error
        // so the client doesn't think future reveals will also work.
        return NextResponse.json(
          { error: `Reveal could not be recorded: ${upsertError.message}` },
          { status: 500 }
        );
      }
      revealedNow = true;
    }

    return NextResponse.json({
      assistantMessage,
      answerRevealed: revealedNow || alreadyRevealed,
      revealAllowed: !isAssigned && !alreadyRevealed && !revealedNow,
      isAssigned,
      attemptsUsed,
      attemptsRemaining,
      hintLevel: mode === "hint" ? hintLevel : undefined,
      blockedReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
