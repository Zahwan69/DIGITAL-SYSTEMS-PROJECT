import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ClassSnapshot } from "@/lib/teacher-chat-context";

export type ChatMode = "class-analytics" | "paper-review" | "write-questions";

const SHARED_SCOPE_LOCK = `SCOPE LOCK — non-negotiable:
- Only answer questions about teaching tasks on StudyAI: class performance, paper review, question writing, syllabus coverage, marking guidance.
- For ANY non-teaching topic — weather, politics, news, jokes, life advice, general knowledge, coding help, opinions, creative writing — reply with EXACTLY this sentence and nothing else: "I can only help with your teaching tasks on StudyAI."
- Do not apologise, do not explain the restriction, do not offer alternatives. Just the sentence above, verbatim.

DATA RULES:
- Use only values present in the context provided. Never invent student names, scores, topics, or paper details.
- Refer to students by their studentLabel (e.g. "Ali H."). Never use raw IDs, emails, or full surnames.
- If the question is in-scope but the context lacks the data, reply "The context loaded for this chat doesn't include that yet." Do NOT use the off-topic refusal sentence in this case.`;

type PaperReviewContext = {
  paper: {
    id: string;
    subject_name: string;
    syllabus_code: string;
    year: number | null;
    paper_number: string | null;
    question_count: number;
  };
  questions: Array<{
    questionNumber: string;
    questionText: string;
    topic: string | null;
    marksAvailable: number;
    difficulty: string | null;
    markingScheme: string | null;
  }>;
};

type WriteQuestionsContext = {
  subject: { id: string; name: string; syllabusCode: string | null; level: string | null } | null;
  syllabus: { filename: string | null; text: string | null };
  sampleQuestions: Array<{
    topic: string | null;
    marksAvailable: number;
    difficulty: string | null;
    questionText: string;
  }>;
};

export async function loadPaperReviewContext(
  paperId: string,
  teacherId: string
): Promise<PaperReviewContext | null> {
  const { data: paper } = await supabaseAdmin
    .from("past_papers")
    .select("id, subject_name, syllabus_code, year, paper_number, question_count, uploaded_by")
    .eq("id", paperId)
    .single();

  if (!paper) return null;
  if (paper.uploaded_by && paper.uploaded_by !== teacherId) {
    // Allow review of any paper the teacher can see — papers are global, but
    // we still record uploaded_by for attribution. No hard restriction here.
  }

  const { data: questions } = await supabaseAdmin
    .from("questions")
    .select("question_number, question_text, topic, marks_available, difficulty, marking_scheme")
    .eq("paper_id", paperId)
    .order("question_number", { ascending: true })
    .limit(200);

  return {
    paper: {
      id: paper.id,
      subject_name: paper.subject_name,
      syllabus_code: paper.syllabus_code,
      year: paper.year,
      paper_number: paper.paper_number,
      question_count: paper.question_count,
    },
    questions: (questions ?? []).map((q) => ({
      questionNumber: String(q.question_number ?? ""),
      questionText: String(q.question_text ?? ""),
      topic: q.topic ?? null,
      marksAvailable: Number(q.marks_available ?? 0),
      difficulty: q.difficulty ?? null,
      markingScheme: q.marking_scheme ?? null,
    })),
  };
}

export async function loadWriteQuestionsContext(
  subjectId: string | null,
  syllabusText: string | null,
  syllabusFilename: string | null
): Promise<WriteQuestionsContext> {
  let subject: WriteQuestionsContext["subject"] = null;
  let sampleQuestions: WriteQuestionsContext["sampleQuestions"] = [];

  if (subjectId) {
    const { data: subjectRow } = await supabaseAdmin
      .from("subjects")
      .select("id, name, syllabus_code, level")
      .eq("id", subjectId)
      .single();
    if (subjectRow) {
      subject = {
        id: subjectRow.id,
        name: subjectRow.name,
        syllabusCode: subjectRow.syllabus_code ?? null,
        level: subjectRow.level ?? null,
      };

      const { data: papers } = subjectRow.syllabus_code
        ? await supabaseAdmin
            .from("past_papers")
            .select("id")
            .eq("syllabus_code", subjectRow.syllabus_code)
            .limit(5)
        : { data: [] };
      const paperIds = (papers ?? []).map((p) => p.id);
      if (paperIds.length > 0) {
        const { data: rows } = await supabaseAdmin
          .from("questions")
          .select("topic, marks_available, difficulty, question_text")
          .in("paper_id", paperIds)
          .limit(15);
        sampleQuestions = (rows ?? []).map((q) => ({
          topic: q.topic ?? null,
          marksAvailable: Number(q.marks_available ?? 0),
          difficulty: q.difficulty ?? null,
          questionText: String(q.question_text ?? "").slice(0, 400),
        }));
      }
    }
  }

  return {
    subject,
    syllabus: {
      filename: syllabusFilename,
      text: syllabusText,
    },
    sampleQuestions,
  };
}

export function buildClassAnalyticsPrompt(snapshot: ClassSnapshot): string {
  return `You are StudyAI's teacher analytics assistant. Answer the teacher's questions about THIS class using the snapshot below.

${SHARED_SCOPE_LOCK}

MODE-SPECIFIC RULES:
- Mode: class-analytics. Your context is the class snapshot. Do not propose new questions or critique paper quality in this mode.
- The snapshot includes recentAttemptDetails with individual student answers, scores, AI feedback, and improvements. Use it when the teacher asks to review a student's answer, identify weak answers, or explain why a student lost marks.
- For weakness or "who needs help" queries, return a short markdown bullet list with the metric in parentheses (e.g. "- Algebra (avg 42%, 18 attempts)"). Highest priority items first.
- For trend or summary queries, one tight paragraph (≤ 4 sentences). No preamble.
- Never both a paragraph and a bullet list — pick one.

Class snapshot:
${JSON.stringify(snapshot, null, 2)}`;
}

export function buildPaperReviewPrompt(context: PaperReviewContext): string {
  return `You are StudyAI's paper-review assistant. The teacher wants feedback on a past paper they uploaded.

${SHARED_SCOPE_LOCK}

MODE-SPECIFIC RULES:
- Mode: paper-review. Your context is the paper details + every question, marking scheme, marks, and difficulty.
- When asked for a review, evaluate: clarity of wording, difficulty curve across questions, syllabus coverage breadth, balance between recall and application, alignment between question and marking scheme.
- When suggesting improvements, be specific: cite the question number and propose a concrete rewrite or addition.
- For specific questions, you may quote short excerpts (≤ 25 words). Do not reproduce the entire paper verbatim.
- Format: bulleted findings grouped under headings (Clarity / Difficulty curve / Coverage / Marking scheme). Skip headings with no findings.

Paper context:
${JSON.stringify(context, null, 2)}`;
}

export function buildWriteQuestionsPrompt(context: WriteQuestionsContext): string {
  return `You are StudyAI's question-writing assistant. Help the teacher draft new exam questions.

${SHARED_SCOPE_LOCK}

MODE-SPECIFIC RULES:
- Mode: write-questions. Your context is the subject metadata, an optional uploaded syllabus document, and a few sample existing questions for style.
- If the teacher hasn't uploaded a syllabus and asks about specific topics not covered by the sample questions, ask them to attach the syllabus PDF before drafting.
- When drafting, output each question with: number, question text, topic, marks, difficulty (easy/medium/hard), and a brief model answer or marking scheme. Use the same style as the sample questions when possible.
- Match the syllabus level (O-Level / A-Level / IGCSE etc.) and the subject's notation conventions.
- Format: numbered list, one question per item. Use markdown bold for the question stem.

Context:
${JSON.stringify(context, null, 2)}`;
}
