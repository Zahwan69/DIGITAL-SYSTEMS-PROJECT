import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildClassSnapshot, type ClassSnapshot } from "@/lib/teacher-chat-context";

export type ChatMode = "class-analytics" | "paper-review" | "write-questions";

const SHARED_SCOPE_LOCK = `SCOPE LOCK:
Your job is to help teachers with StudyAI work: class performance, paper review, question/worksheet writing, syllabus coverage, marking guidance, and short conversational support around those tasks.

ALWAYS respond normally to:
- greetings, thanks, acknowledgements ("hi", "thanks", "got it")
- short clarifying questions about what you can do
- trivial helpful asks where the teacher gives a teaching reason — for example today's date or the current time so they can stamp a paper, the spelling of a word, a quick unit conversion for a question they are writing

REFUSE only when the teacher asks for substantive off-mission work — for example: writing creative fiction or poems unrelated to a question, debugging code, weather/news/sports, political or personal opinions, generic life advice, or anything that is not connected to teaching or StudyAI.
When you refuse, write ONE polite sentence that names what you can help with instead. Do not parrot the same canned line repeatedly across turns. Example: "That's outside what I can help with — I can review your class's results, look at a paper, or draft questions if you want." Vary the wording on follow-ups so it does not feel robotic.

DATA RULES:
- Use only values present in the context provided. Never invent student names, scores, topics, or paper details.
- Refer to students by their studentLabel (e.g. "Ali H."). Never use raw IDs, emails, or full surnames.
- If the question is in-scope but the context lacks the data, say so plainly (e.g. "The context loaded for this chat doesn't include that yet"). Do NOT use the off-mission refusal in this case.`;

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
  studentAttempts: Array<{
    studentLabel: string;
    questionNumber: string;
    topic: string | null;
    questionText: string;
    answerText: string;
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    improvements: string[];
    needsTeacherReview: boolean;
    at: string;
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
  teacherId: string,
  classId?: string | null
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
    .select("id, question_number, question_text, topic, marks_available, difficulty, marking_scheme")
    .eq("paper_id", paperId)
    .order("question_number", { ascending: true })
    .limit(200);

  const questionRows = questions ?? [];
  const questionById = new Map(questionRows.map((question) => [question.id, question]));
  let studentAttempts: PaperReviewContext["studentAttempts"] = [];

  if (classId && questionRows.length > 0) {
    const { data: classRow } = await supabaseAdmin
      .from("classes")
      .select("id, teacher_id")
      .eq("id", classId)
      .single();

    if (classRow?.teacher_id === teacherId) {
      const { data: members } = await supabaseAdmin
        .from("class_members")
        .select("student_id")
        .eq("class_id", classId)
        .limit(200);

      const studentIds = (members ?? []).map((member) => member.student_id);
      const questionIds = questionRows.map((question) => question.id);

      if (studentIds.length > 0 && questionIds.length > 0) {
        const [{ data: attempts }, { data: profiles }] = await Promise.all([
          supabaseAdmin
            .from("attempts")
            .select("user_id, question_id, answer_text, score, max_score, percentage, feedback, improvements, needs_teacher_review, answer_image_path, created_at")
            .in("question_id", questionIds)
            .in("user_id", studentIds)
            .order("created_at", { ascending: false })
            .limit(40),
          supabaseAdmin.from("profiles").select("id, username, full_name").in("id", studentIds),
        ]);

        const labels = new Map(
          (profiles ?? []).map((profile) => [
            profile.id as string,
            profile.full_name || profile.username || "Student",
          ])
        );

        studentAttempts = (attempts ?? []).map((attempt) => {
          const question = questionById.get(attempt.question_id);
          return {
            studentLabel: labels.get(attempt.user_id) ?? "Student",
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
            needsTeacherReview: Boolean(attempt.needs_teacher_review || attempt.answer_image_path),
            at: attempt.created_at,
          };
        });
      }
    }
  }

  return {
    paper: {
      id: paper.id,
      subject_name: paper.subject_name,
      syllabus_code: paper.syllabus_code,
      year: paper.year,
      paper_number: paper.paper_number,
      question_count: paper.question_count,
    },
    questions: questionRows.map((q) => ({
      questionNumber: String(q.question_number ?? ""),
      questionText: String(q.question_text ?? ""),
      topic: q.topic ?? null,
      marksAvailable: Number(q.marks_available ?? 0),
      difficulty: q.difficulty ?? null,
      markingScheme: q.marking_scheme ?? null,
    })),
    studentAttempts,
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
- The context may also include studentAttempts for the selected class and paper. Use these when the teacher asks about student answers, lost marks, weak responses, or who needs review. These attempts do not need to be flagged as teacher review to be useful.
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

// =============================================================================
// UNIFIED TEACHER ASSISTANT (single chat, no visible mode)
// =============================================================================

export type UnifiedTeacherContext = {
  classSnapshot: ClassSnapshot | null;
  classSnapshotHasData: boolean;
  paper: PaperReviewContext | null;
  writeQuestions: WriteQuestionsContext;
  hasSyllabus: boolean;
  hasSubject: boolean;
  hasPaper: boolean;
  hasClass: boolean;
};

export async function loadUnifiedTeacherContext(args: {
  classId: string | null;
  teacherId: string;
  paperId: string | null;
  subjectId: string | null;
  syllabusText: string | null;
  syllabusFilename: string | null;
}): Promise<UnifiedTeacherContext> {
  const { classId, teacherId, paperId, subjectId, syllabusText, syllabusFilename } = args;

  const [classSnapshot, paperContext, writeQuestionsContext] = await Promise.all([
    classId
      ? buildClassSnapshot(classId, teacherId).catch(() => null)
      : Promise.resolve(null),
    paperId ? loadPaperReviewContext(paperId, teacherId, classId).catch(() => null) : Promise.resolve(null),
    loadWriteQuestionsContext(subjectId, syllabusText, syllabusFilename),
  ]);

  const classSnapshotHasData = Boolean(
    classSnapshot &&
      (classSnapshot.attemptsSummary.total30d > 0 ||
        classSnapshot.assignments.some((a) => a.attempted > 0) ||
        classSnapshot.recentActivity.length > 0 ||
        classSnapshot.roster.length > 0 ||
        classSnapshot.assignments.length > 0)
  );

  return {
    classSnapshot,
    classSnapshotHasData,
    paper: paperContext,
    writeQuestions: writeQuestionsContext,
    hasSyllabus: Boolean(syllabusText && syllabusText.trim().length > 0),
    hasSubject: Boolean(writeQuestionsContext.subject),
    hasPaper: Boolean(paperContext),
    hasClass: Boolean(classId),
  };
}

export function buildUnifiedTeacherPrompt(context: UnifiedTeacherContext): string {
  // The unified prompt does the intent inference itself instead of routing
  // through three separate builders. The frontend never asks the teacher to
  // pick a mode — context chips populate optional fields and the assistant
  // figures out what the message is asking for.
  const payload = {
    class: context.classSnapshot,
    classHasData: context.classSnapshotHasData,
    paper: context.paper,
    subject: context.writeQuestions.subject,
    syllabus: context.writeQuestions.syllabus,
    sampleQuestions: context.writeQuestions.sampleQuestions,
    availability: {
      hasClass: context.hasClass,
      hasPaper: context.hasPaper,
      hasSubject: context.hasSubject,
      hasSyllabus: context.hasSyllabus,
    },
  };

  return `You are StudyAI's unified teaching assistant. The teacher has a single chat with you and you decide what they're asking for from their message.

${SHARED_SCOPE_LOCK}

INTENT INFERENCE — pick exactly one before answering, but DO NOT label or announce it to the teacher:
- class_analytics: questions about class performance, student weaknesses, who is struggling, revision focus, recent attempts, who needs review.
- paper_review: review the wording, balance, difficulty, coverage, or marking alignment of a selected paper or its individual questions.
- question_generation: write new exam questions, possibly with model answers and marking points.
- worksheet_generation: produce a worksheet, problem set, or multi-question handout.
- marking_guidance: explain or draft mark schemes, marking criteria, or feedback rubrics.
- syllabus_coverage: explain what a syllabus/specification covers or which topics to prioritise.
- teaching_recommendation: lesson focus, what to teach next, intervention ideas.
- general_teaching_support: short answer to a teaching-process question that doesn't fit a category above.

CONTEXT AVAILABILITY (use these flags to decide whether to proceed or ask for context):
- availability.hasClass = ${context.hasClass}
- availability.hasPaper = ${context.hasPaper}
- availability.hasSubject = ${context.hasSubject}
- availability.hasSyllabus = ${context.hasSyllabus}
- classHasData = ${context.classSnapshotHasData}

MISSING-CONTEXT GUARD — when the inferred intent needs context that is not available, respond ONLY with a short, direct request such as:
- "Please select a class so I can review its analytics." (class_analytics without hasClass or classHasData)
- "Please select a paper from the picker so I can review it." (paper_review without hasPaper)
- "Please attach a syllabus/specification PDF using the + button, or pick a subject/paper, so I can align the questions correctly." (question_generation / worksheet_generation when neither hasSyllabus nor hasSubject nor hasPaper)
- "Tell me which paper or paste the question text — I don't have it in context." (marking_guidance without paper or syllabus)
Do NOT use the off-topic refusal sentence for missing-context cases.

OUTPUT RULES BY INTENT:
- class_analytics:
  * For "who needs help" / weakness queries → short markdown bullet list, weakest first, metric in parentheses (e.g. "- Algebra (avg 42%, 18 attempts)").
  * For trend or summary → one tight paragraph (≤ 4 sentences). No preamble.
  * Reference students by studentLabel (e.g. "Ali H."). Never use raw IDs.
- paper_review:
  * Evaluate: clarity, difficulty curve, coverage, recall-vs-application balance, marking alignment.
  * Cite question numbers when proposing rewrites. Quote ≤ 25 words from a question.
  * Format: bulleted findings grouped under headings (Clarity / Difficulty curve / Coverage / Marking scheme). Skip empty headings.
- question_generation / worksheet_generation:
  * Numbered list, one question per item.
  * Each: bold question stem, then topic, marks, difficulty (easy/medium/hard), model answer, marking points.
  * Match the syllabus level and subject conventions.
  * If teacher asks to adjust difficulty, regenerate accordingly.
- marking_guidance:
  * Provide concise marking points / criteria. Use bullets.
- syllabus_coverage:
  * Short paragraph plus an optional priority bullet list.
- teaching_recommendation / general_teaching_support:
  * Direct, brief, actionable. Avoid filler.

GENERAL RULES:
- Stay focused on StudyAI teaching and assessment tasks.
- Never invent student names, scores, paper details, or syllabus content not present in the context.
- If context exists but doesn't include the specific data asked about, reply: "The context loaded for this chat doesn't include that yet."
- Never both a paragraph and a bullet list for the same answer — pick one.

Context payload:
${JSON.stringify(payload, null, 2)}`;
}

