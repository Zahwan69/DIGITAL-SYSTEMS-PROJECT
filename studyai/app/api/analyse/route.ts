import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { buildAnalysePrompt, generateGeminiContent } from "@/lib/gemini";
import { renderPdfPageToPng } from "@/lib/pdf-render";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ExtractedQuestion = {
  questionNumber: string;
  questionText: string;
  topic: string;
  marksAvailable: number;
  difficulty: "easy" | "medium" | "hard";
  markingScheme: string | null;
  hasDiagram: boolean;
  diagramPage: number | null;
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
  hasDiagram?: boolean;
  has_diagram?: boolean;
  diagramPage?: number | string;
  diagram_page?: number | string;
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

  const rawHasDiagram = raw.hasDiagram ?? raw.has_diagram;
  const hasDiagram = rawHasDiagram === true;
  const diagramSource = raw.diagramPage ?? raw.diagram_page;
  const diagramPageParsed =
    typeof diagramSource === "number"
      ? diagramSource
      : Number.parseInt(String(diagramSource ?? ""), 10);
  const diagramPage =
    hasDiagram && Number.isFinite(diagramPageParsed) && diagramPageParsed > 0
      ? diagramPageParsed
      : null;

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
    hasDiagram: hasDiagram && diagramPage !== null,
    diagramPage,
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
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

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

    const createdPaperIds: string[] = [];
    let totalExtractedQuestions = 0;

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");

      const { result } = await generateGeminiContent([
        { text: buildAnalysePrompt() },
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
          uploaded_by: auth.userId,
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

      const pdfBytes = new Uint8Array(bytes);
      const uniqueDiagramPages = new Set<number>();
      for (const question of extractedQuestions) {
        if (question.hasDiagram && question.diagramPage) {
          uniqueDiagramPages.add(question.diagramPage);
        }
      }

      const uploadedPageAssets = new Map<number, { path: string; url: string }>();
      for (const page of uniqueDiagramPages) {
        const path = `${paperRow.id}/page-${page}.png`;
        try {
          const pngBuffer = await renderPdfPageToPng(pdfBytes, page);
          const { error: uploadError } = await supabaseAdmin.storage
            .from("question-images")
            .upload(path, pngBuffer, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadError) {
            console.warn(`[analyse] Failed to upload diagram page ${page}: ${uploadError.message}`);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabaseAdmin.storage.from("question-images").getPublicUrl(path);
          if (publicUrl) {
            uploadedPageAssets.set(page, { path, url: publicUrl });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown render error";
          console.warn(`[analyse] Failed to render/upload page ${page}: ${message}`);
        }
      }

      const questionRows = extractedQuestions.map((question, index) => {
        const diagramAsset =
          question.hasDiagram && question.diagramPage
            ? uploadedPageAssets.get(question.diagramPage) ?? null
            : null;

        return {
          paper_id: paperRow.id,
          question_number: question.questionNumber?.trim() || String(index + 1),
          question_text: question.questionText?.trim() || "Question text unavailable",
          topic: question.topic?.trim() || "General",
          marks_available: Number.isFinite(question.marksAvailable)
            ? Number(question.marksAvailable)
            : 0,
          difficulty: normalizeDifficulty(question.difficulty ?? "medium"),
          marking_scheme: question.markingScheme?.trim() || null,
          has_diagram: Boolean(diagramAsset),
          image_url: diagramAsset?.url ?? null,
          image_path: diagramAsset?.path ?? null,
        };
      });

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
