import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { buildAnalysePrompt, generateGeminiContent } from "@/lib/gemini";
import { cropPng, renderPdfPageToPng } from "@/lib/pdf-render";
import {
  parseQuestionPaperDeterministic,
  type ParsedQuestion,
  type ParsedQuestionPaper,
  type ParserDebug,
} from "@/lib/pdf-parser";
import { ensureBucket } from "@/lib/storage-buckets";
import { supabaseAdmin } from "@/lib/supabase/admin";

type BoundingBox = [number, number, number, number]; // [y_min, x_min, y_max, x_max] normalized 0-1000

type ExtractedQuestion = {
  questionNumber: string;
  questionText: string;
  topic: string;
  marksAvailable: number;
  difficulty: "easy" | "medium" | "hard";
  markingScheme: string | null;
  hasDiagram: boolean;
  diagramPage: number | null;
  diagramBoundingBox: BoundingBox | null;
  parsed?: ParsedQuestion | null;
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
  diagramBoundingBox?: unknown;
  diagram_bounding_box?: unknown;
  bbox?: unknown;
};

function parseBoundingBox(raw: unknown): BoundingBox | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const numbers = raw.map((value) =>
    typeof value === "number" ? value : Number.parseFloat(String(value))
  );
  if (!numbers.every((n) => Number.isFinite(n))) return null;
  const [yMin, xMin, yMax, xMax] = numbers as [number, number, number, number];
  if (xMin < 0 || yMin < 0 || xMax > 1000 || yMax > 1000) return null;
  if (xMax - xMin < 20 || yMax - yMin < 20) return null;
  // Reject boxes covering >85% of the page; almost always hallucinated.
  const area = (xMax - xMin) * (yMax - yMin);
  if (area > 850_000) return null;
  return [yMin, xMin, yMax, xMax];
}

const SYLLABUS_NAMES: Record<string, string> = {
  "0417": "Information & Communication Technology",
  "0450": "Business Studies",
  "0478": "Computer Science",
  "0500": "English - First Language",
  "0510": "English as a Second Language",
  "0522": "English Language",
  "0580": "Mathematics",
  "0606": "Additional Mathematics",
  "0610": "Biology",
  "0620": "Chemistry",
  "0625": "Physics",
  "0648": "Environmental Management",
  "0654": "Co-ordinated Sciences",
  "0680": "Environmental Management",
  "0700": "First Language English",
  "0990": "Economics",
  "9700": "Biology (A-Level)",
  "9701": "Chemistry (A-Level)",
  "9702": "Physics (A-Level)",
  "9706": "Accounting (A-Level)",
  "9708": "Economics (A-Level)",
  "9709": "Mathematics (A-Level)",
  "9713": "Applied ICT (A-Level)",
  "9093": "English Language (A-Level)",
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

  const bboxRaw = raw.diagramBoundingBox ?? raw.diagram_bounding_box ?? raw.bbox;
  const diagramBoundingBox =
    hasDiagram && diagramPage !== null ? parseBoundingBox(bboxRaw) : null;

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
    diagramBoundingBox,
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

function normalizeQuestionKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function matchGeminiQuestion(
  parsedQuestion: ParsedQuestion,
  index: number,
  geminiQuestions: ExtractedQuestion[]
) {
  const key = normalizeQuestionKey(parsedQuestion.id);
  return (
    geminiQuestions.find((question) => normalizeQuestionKey(question.questionNumber) === key) ??
    geminiQuestions[index] ??
    null
  );
}

function fromParsedQuestion(
  question: ParsedQuestion,
  index: number,
  geminiQuestions: ExtractedQuestion[]
): ExtractedQuestion {
  const enrichment = matchGeminiQuestion(question, index, geminiQuestions);

  return {
    questionNumber: question.id,
    questionText: question.text,
    topic: enrichment?.topic?.trim() || "General",
    marksAvailable:
      question.marksAvailable > 0
        ? question.marksAvailable
        : Number.isFinite(enrichment?.marksAvailable)
          ? enrichment!.marksAvailable
          : 0,
    difficulty: normalizeDifficulty(enrichment?.difficulty ?? "medium"),
    markingScheme: enrichment?.markingScheme?.trim() || null,
    hasDiagram: question.visuals.length > 0,
    diagramPage: question.visuals[0]?.pageNumber ?? null,
    diagramBoundingBox: null,
    parsed: question,
  };
}

function buildEnrichmentPrompt(questions: ParsedQuestion[], options: { hasMarkScheme: boolean }) {
  const markSchemeRule = options.hasMarkScheme
    ? "- An official mark scheme PDF is attached. Map mark scheme guidance to the provided top-level question ids. If unsure, return null for markingScheme."
    : "- No official mark scheme PDF is attached. Return null for markingScheme if unsure.";

  return `You enrich already-extracted Cambridge exam questions.
The parser has already decided question boundaries and geometry. Do not create, split, merge, reorder, or locate questions.

Return ONLY valid JSON:
{
  "questions": [
    {
      "questionNumber": "1",
      "topic": "specific Cambridge syllabus topic name",
      "marksAvailable": 6,
      "difficulty": "easy|medium|hard",
      "markingScheme": "concise marking guidance or null"
    }
  ]
}

Rules:
- Return exactly one object for each provided questionNumber, in the same order.
- Do not include diagramPage, diagramBoundingBox, image data, or visual geometry.
- marksAvailable should match the provided marks unless the value is 0 and the mark scheme clearly gives a better top-level total.
- difficulty must be easy, medium, or hard.
${markSchemeRule}

Extracted questions:
${JSON.stringify(
  questions.map((question) => ({
    questionNumber: question.id,
    questionText: question.text,
    marksAvailable: question.marksAvailable,
  })),
  null,
  2
)}`;
}

function isPdfUpload(file: File) {
  if (/\.pdf$/i.test(file.name)) return true;
  return /pdf/i.test(file.type);
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const formData = await request.formData();
    const manualSubjectName = String(formData.get("subjectName") ?? "").trim();
    const syllabusCode = String(formData.get("syllabusCode") ?? "").trim();
    const paperDescription = String(formData.get("paperDescription") ?? "").trim() || null;
    const yearRaw = formData.get("year");
    const year = yearRaw ? parseInt(String(yearRaw), 10) || null : null;
    const level = String(formData.get("level") ?? "IGCSE").trim() || "IGCSE";

    const uploaded = formData.getAll("files");
    const files = uploaded.filter((value): value is File => value instanceof File);
    const markSchemeUploads = formData.getAll("markSchemeFiles");
    const markSchemeFiles = markSchemeUploads.filter(
      (value): value is File => value instanceof File
    );

    if (!manualSubjectName && !syllabusCode) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one PDF file is required." }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "You can upload up to 10 PDF files." }, { status: 400 });
    }

    if (markSchemeFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one mark scheme PDF is required." },
        { status: 400 }
      );
    }

    if (markSchemeFiles.length > 10) {
      return NextResponse.json(
        { error: "You can upload up to 10 mark scheme PDF files." },
        { status: 400 }
      );
    }

    if (markSchemeFiles.length > 1 && markSchemeFiles.length !== files.length) {
      return NextResponse.json(
        {
          error:
            "Upload one mark scheme for all question papers, or one mark scheme for each question paper.",
        },
        { status: 400 }
      );
    }

    const hasNonPdf = [...files, ...markSchemeFiles].some((file) => !isPdfUpload(file));
    if (hasNonPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const createdPaperIds: string[] = [];
    let totalExtractedQuestions = 0;
    const diagramWarnings: string[] = [];
    const parserDebug: ParserDebug[] = [];
    const debugParser =
      String(formData.get("debugParser") ?? "").toLowerCase() === "true" ||
      new URL(request.url).searchParams.get("debugParser") === "1";

    try {
      await ensureBucket("question-images", { public: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown bucket error";
      return NextResponse.json(
        {
          error: `Cannot prepare diagram storage: ${message}. Create a public bucket named "question-images" in Supabase Storage and try again.`,
        },
        { status: 500 }
      );
    }

    try {
      await ensureBucket("question-papers", { public: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown bucket error";
      return NextResponse.json(
        {
          error: `Cannot prepare original-paper storage: ${message}. Create a private bucket named "question-papers" in Supabase Storage and try again.`,
        },
        { status: 500 }
      );
    }

    for (const [fileIndex, file] of files.entries()) {
      const bytes = await file.arrayBuffer();
      const pdfBytes = new Uint8Array(bytes);
      const markSchemeFile =
        markSchemeFiles.length === files.length
          ? markSchemeFiles[fileIndex]
          : markSchemeFiles[0] ?? null;

      let parsedPaper: ParsedQuestionPaper;
      try {
        parsedPaper = await parseQuestionPaperDeterministic(pdfBytes, { debug: debugParser });
        diagramWarnings.push(...parsedPaper.warnings);
        if (parsedPaper.debug) parserDebug.push(parsedPaper.debug);
      } catch (error) {
        const message = error instanceof Error ? error.message : "deterministic parser failed";
        diagramWarnings.push(`Deterministic parser failed: ${message}`);
        parsedPaper = { questions: [], warnings: [] };
      }

      const geminiStructuralFallbackEnabled =
        process.env.ENABLE_GEMINI_STRUCTURAL_FALLBACK === "true";
      const parserHasNoAnchors =
        parsedPaper.questions.length === 0 ||
        parsedPaper.questions.some((question) =>
          question.warnings.some((warning) => warning.startsWith("No question anchors found"))
        );
      const useGeminiForStructure = parserHasNoAnchors && geminiStructuralFallbackEnabled;
      const deterministicQuestions = useGeminiForStructure ? [] : parsedPaper.questions;

      if (parserHasNoAnchors && !geminiStructuralFallbackEnabled) {
        diagramWarnings.push(
          "Deterministic parser found no top-level questions. Set ENABLE_GEMINI_STRUCTURAL_FALLBACK=true to allow a Gemini text backup, or upload a clearer PDF."
        );
      }

      let geminiQuestions: ExtractedQuestion[] = [];
      const shouldCallGemini = deterministicQuestions.length > 0 || useGeminiForStructure;

      if (shouldCallGemini) {
        try {
          const promptParts: Parameters<typeof generateGeminiContent>[0] =
            deterministicQuestions.length > 0
              ? [
                  {
                    text: buildEnrichmentPrompt(deterministicQuestions, {
                      hasMarkScheme: Boolean(markSchemeFile),
                    }),
                  },
                ]
              : [
                  { text: buildAnalysePrompt({ hasMarkScheme: Boolean(markSchemeFile) }) },
                  { text: "QUESTION PAPER PDF:" },
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: Buffer.from(bytes).toString("base64"),
                    },
                  },
                ];

          if (markSchemeFile) {
            const markSchemeBytes = await markSchemeFile.arrayBuffer();
            promptParts.push(
              { text: "OFFICIAL MARK SCHEME PDF:" },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: Buffer.from(markSchemeBytes).toString("base64"),
                },
              }
            );
          }

          const { result } = await generateGeminiContent(promptParts);
          geminiQuestions = parseQuestionsFromGemini(result.response.text());
        } catch (error) {
          const message = error instanceof Error ? error.message : "Gemini enrichment failed.";
          diagramWarnings.push(`Gemini enrichment skipped: ${message}`);
        }
      }

      let extractedQuestions = deterministicQuestions.map((question, index) =>
        fromParsedQuestion(question, index, geminiQuestions)
      );

      if (
        useGeminiForStructure &&
        extractedQuestions.length === 0 &&
        geminiQuestions.length > 0
      ) {
        diagramWarnings.push(
          "Deterministic parser produced no questions; using Gemini text backup. Gemini diagram fields are discarded — image_url, has_diagram, and crop coordinates remain parser-controlled."
        );
        extractedQuestions = geminiQuestions.map((question) => ({
          ...question,
          hasDiagram: false,
          diagramPage: null,
          diagramBoundingBox: null,
          parsed: null,
        }));
      }

      if (extractedQuestions.length === 0 && parsedPaper.questions.length > 0) {
        diagramWarnings.push("Gemini backup failed; using low-confidence deterministic parser output.");
        extractedQuestions = parsedPaper.questions.map((question, index) =>
          fromParsedQuestion(question, index, [])
        );
      }

      if (process.env.NODE_ENV !== "production" || debugParser) {
        for (let logIndex = 0; logIndex < extractedQuestions.length; logIndex += 1) {
          const question = extractedQuestions[logIndex];
          const parsed = question.parsed;
          const pages = parsed?.segmented.pageSpans.map((span) => span.pageNumber) ?? [];
          const pageRange = pages.length
            ? `p${Math.min(...pages)}-p${Math.max(...pages)}`
            : "p?";
          const visual = parsed?.visuals[0] ?? null;
          console.info(
            `[analyse] q${question.questionNumber} idx=${logIndex} ${pageRange} textLen=${question.questionText.length} visual=${
              visual
                ? `bbox=[${visual.bbox.join(",")}] confidence=${visual.confidence.toFixed(2)}`
                : "none"
            }${parsed?.warnings.length ? ` warnings=${parsed.warnings.join(" | ")}` : ""}`
          );
        }
      }

      const subjectName =
        manualSubjectName || SYLLABUS_NAMES[syllabusCode] || `Syllabus ${syllabusCode}`;
      const storedSyllabusCode = syllabusCode || "manual";

      const { data: paperRow, error: paperError } = await supabaseAdmin
        .from("past_papers")
        .insert({
          uploaded_by: auth.userId,
          subject_name: subjectName,
          syllabus_code: storedSyllabusCode,
          year,
          paper_number: paperDescription,
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

      const originalPdfPath = `${paperRow.id}.pdf`;
      const { error: pdfUploadError } = await supabaseAdmin.storage
        .from("question-papers")
        .upload(originalPdfPath, Buffer.from(bytes), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (pdfUploadError) {
        diagramWarnings.push(
          `Original PDF could not be archived: ${pdfUploadError.message}. The viewer fallback will be unavailable for this paper.`
        );
      } else {
        const { error: fileUrlUpdateError } = await supabaseAdmin
          .from("past_papers")
          .update({ file_url: originalPdfPath })
          .eq("id", paperRow.id);
        if (fileUrlUpdateError) {
          diagramWarnings.push(
            `Original PDF uploaded but file_url could not be saved: ${fileUrlUpdateError.message}.`
          );
        }
      }

      // Cache page renders so we only render each unique page once, regardless
      // of how many questions live on it.
      const pageBuffers = new Map<number, Buffer>();
      async function getPageBuffer(page: number): Promise<Buffer | null> {
        if (pageBuffers.has(page)) return pageBuffers.get(page)!;
        try {
          const buf = await renderPdfPageToPng(pdfBytes, page);
          pageBuffers.set(page, buf);
          return buf;
        } catch (error) {
          const message = error instanceof Error ? error.message : "render failed";
          diagramWarnings.push(`page ${page}: ${message}`);
          return null;
        }
      }

      const questionAssets = new Map<number, { path: string; url: string }>();

      for (let i = 0; i < extractedQuestions.length; i += 1) {
        const question = extractedQuestions[i];
        const visual = question.parsed?.visuals[0] ?? null;
        if (!visual) continue;

        const pageBuffer = await getPageBuffer(visual.pageNumber);
        if (!pageBuffer) continue;

        const safeNumber = (question.questionNumber || String(i + 1)).replace(/[^a-z0-9]+/gi, "_");
        const path = `${paperRow.id}/q-${i + 1}-${safeNumber}.png`;
        let buffer: Buffer;

        try {
          buffer = await cropPng(pageBuffer, visual.bbox);
        } catch (error) {
          const message = error instanceof Error ? error.message : "crop failed";
          diagramWarnings.push(`q${question.questionNumber}: ${message}`);
          continue;
        }

        const { error: uploadError } = await supabaseAdmin.storage
          .from("question-images")
          .upload(path, buffer, { contentType: "image/png", upsert: true });
        if (uploadError) {
          const detail = `q${question.questionNumber}: ${uploadError.message}`;
          console.warn(`[analyse] ${detail}`);
          diagramWarnings.push(detail);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("question-images").getPublicUrl(path);
        if (publicUrl) {
          questionAssets.set(i, { path, url: publicUrl });
        }
      }

      const questionRows = extractedQuestions.map((question, index) => {
        const diagramAsset = questionAssets.get(index) ?? null;
        const pages = question.parsed?.segmented.pageSpans.map((span) => span.pageNumber) ?? [];
        const pageStart = pages.length ? Math.min(...pages) : null;
        const pageEnd = pages.length ? Math.max(...pages) : null;

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
          page_start: pageStart,
          page_end: pageEnd,
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
      diagramWarnings: diagramWarnings.length > 0 ? diagramWarnings : undefined,
      parserDebug: debugParser ? parserDebug : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
