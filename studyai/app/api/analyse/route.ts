import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateGeminiContent } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ExtractedQuestion = {
  questionNumber: string;
  questionText: string;
  topic: string;
  marksAvailable: number;
  difficulty: "easy" | "medium" | "hard";
  markingScheme: string | null;
};

type LooseQuestion = {
  questionNumber?: string;
  question_number?: string;
  number?: string;
  questionText?: string;
  question_text?: string;
  text?: string;
  topic?: string;
  marksAvailable?: number | string;
  marks_available?: number | string;
  marks?: number | string;
  difficulty?: string;
  markingScheme?: string | null;
  marking_scheme?: string | null;
};

function extractJsonObjectCandidate(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  for (let i = start; i < input.length; i += 1) {
    const char = input[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return input.slice(start, i + 1);
    }
  }

  return null;
}

function normalizeQuestion(raw: LooseQuestion, index: number): ExtractedQuestion {
  const marksSource =
    raw.marksAvailable ?? raw.marks_available ?? raw.marks ?? 0;
  const parsedMarks =
    typeof marksSource === "number"
      ? marksSource
      : Number.parseInt(String(marksSource), 10);

  return {
    questionNumber:
      raw.questionNumber?.trim() ||
      raw.question_number?.trim() ||
      raw.number?.trim() ||
      String(index + 1),
    questionText:
      raw.questionText?.trim() ||
      raw.question_text?.trim() ||
      raw.text?.trim() ||
      "Question text unavailable",
    topic: raw.topic?.trim() || "General",
    marksAvailable: Number.isFinite(parsedMarks) ? parsedMarks : 0,
    difficulty: normalizeDifficulty(raw.difficulty ?? "medium"),
    markingScheme:
      raw.markingScheme?.trim() ?? raw.marking_scheme?.trim() ?? null,
  };
}

function parseQuestionsFromGemini(rawText: string): ExtractedQuestion[] {
  const cleanText = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const tryParse = (candidate: string): LooseQuestion[] | null => {
    try {
      const parsed = JSON.parse(candidate) as
        | { questions?: LooseQuestion[] }
        | LooseQuestion[];

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        return null;
      }
      return parsed.questions;
    } catch {
      return null;
    }
  };

  const directQuestions = tryParse(cleanText);
  if (directQuestions) {
    return directQuestions.map(normalizeQuestion);
  }

  const objectCandidate = extractJsonObjectCandidate(cleanText);
  if (objectCandidate) {
    const parsedFromObject = tryParse(objectCandidate);
    if (parsedFromObject) {
      return parsedFromObject.map(normalizeQuestion);
    }
  }

  const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    const parsedFromArray = tryParse(arrayMatch[0]);
    if (parsedFromArray) {
      return parsedFromArray.map(normalizeQuestion);
    }
  }

  throw new Error("Gemini response was not valid JSON.");
}

function normalizeDifficulty(value: string): "easy" | "medium" | "hard" {
  const normalized = value.toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard") {
    return normalized;
  }
  return "medium";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const syllabusCode = String(formData.get("syllabusCode") ?? "").trim();

    const uploaded = formData.getAll("files");
    const files = uploaded.filter((value): value is File => value instanceof File);

    if (!syllabusCode) {
      return NextResponse.json({ error: "Syllabus code is required." }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required." }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "You can upload up to 10 PDF files." }, { status: 400 });
    }

    const hasNonPdf = files.some((file) => file.type !== "application/pdf");
    if (hasNonPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Missing token." }, { status: 401 });
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

    const createdPaperIds: string[] = [];
    let totalExtractedQuestions = 0;

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const prompt = `You are extracting Cambridge exam questions from a PDF.
Return ONLY valid JSON with this exact shape:
{
  "questions": [
    {
      "questionNumber": "1(a)",
      "questionText": "full question text",
      "topic": "specific Cambridge syllabus topic name",
      "marksAvailable": 4,
      "difficulty": "easy|medium|hard",
      "markingScheme": "marking guidance or null"
    }
  ]
}

Rules:
- No markdown, no explanation, no code fences.
- Include every visible question in order.
- marksAvailable must be a number.
- difficulty must be one of easy, medium, hard.
- If unsure about marking scheme, return null.`;

      const { result } = await generateGeminiContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        },
      ]);

      const responseText = result.response.text();
      const extractedQuestions = parseQuestionsFromGemini(responseText);

      const subjectName = `Syllabus ${syllabusCode}`;
      const level = "IGCSE";
      const year = null;

      const { data: paperRow, error: paperError } = await supabaseAdmin
        .from("past_papers")
        .insert({
          uploaded_by: user.id,
          subject_name: subjectName,
          syllabus_code: syllabusCode,
          year,
          level,
          question_count: extractedQuestions.length,
        })
        .select("id")
        .single();

      if (paperError || !paperRow) {
        return NextResponse.json(
          { error: paperError?.message ?? "Failed to save past paper." },
          { status: 500 }
        );
      }

      const questionRows = extractedQuestions.map((question, index) => ({
        paper_id: paperRow.id,
        question_number:
          question.questionNumber?.trim() || String(index + 1),
        question_text: question.questionText?.trim() || "Question text unavailable",
        topic: question.topic?.trim() || "General",
        marks_available: Number.isFinite(question.marksAvailable)
          ? Number(question.marksAvailable)
          : 0,
        difficulty: normalizeDifficulty(question.difficulty ?? "medium"),
        marking_scheme: question.markingScheme?.trim() || null,
      }));

      const { error: questionError } = await supabaseAdmin.from("questions").insert(questionRows);
      if (questionError) {
        return NextResponse.json(
          { error: questionError.message },
          { status: 500 }
        );
      }

      createdPaperIds.push(paperRow.id);
      totalExtractedQuestions += extractedQuestions.length;
    }

    return NextResponse.json({
      success: true,
      paperId: createdPaperIds[0] ?? null,
      paperIds: createdPaperIds,
      questionCount: totalExtractedQuestions,
      questionsExtracted: totalExtractedQuestions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
