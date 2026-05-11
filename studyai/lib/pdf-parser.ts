import "server-only";

import { detectDiagramBoxForQuestionSpan, type NormalizedBoundingBox } from "@/lib/pdf-diagrams";

const VISUAL_CONFIDENCE_FLOOR = 0.45;
import { extractPdfLayout, type PdfDocumentLayout } from "@/lib/pdf-layout";
import { renderPdfPageToPng } from "@/lib/pdf-render";
import { segmentQuestions, type SegmentedQuestion } from "@/lib/question-segmentation";

export type ParserVisualCandidate = {
  pageNumber: number;
  bbox: NormalizedBoundingBox;
  confidence: number;
  reason: string;
  warnings: string[];
};

export type ParsedQuestion = {
  id: string;
  text: string;
  marksAvailable: number;
  confidence: number;
  warnings: string[];
  segmented: SegmentedQuestion;
  visuals: ParserVisualCandidate[];
};

export type ParserDebug = {
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    lineCount: number;
    lines?: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  }>;
  questions: Array<{
    id: string;
    confidence: number;
    marksAvailable: number;
    spans: Array<{
      pageNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    visualCount: number;
    warnings: string[];
  }>;
  warnings: string[];
};

export type ParsedQuestionPaper = {
  questions: ParsedQuestion[];
  warnings: string[];
  debug?: ParserDebug;
};

function buildDebug(layout: PdfDocumentLayout, questions: ParsedQuestion[], warnings: string[]): ParserDebug {
  return {
    pages: layout.pages.map((page) => ({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      lineCount: page.lines.length,
      lines: page.lines.map((line) => ({
        text: line.text,
        x: Math.round(line.x),
        y: Math.round(line.y),
        width: Math.round(line.width),
        height: Math.round(line.height),
      })),
    })),
    questions: questions.map((question) => ({
      id: question.id,
      confidence: question.confidence,
      marksAvailable: question.marksAvailable,
      spans: question.segmented.pageSpans.map((span) => ({
        pageNumber: span.pageNumber,
        x: Math.round(span.box.x),
        y: Math.round(span.box.y),
        width: Math.round(span.box.width),
        height: Math.round(span.box.height),
      })),
      visualCount: question.visuals.length,
      warnings: question.warnings,
    })),
    warnings,
  };
}

export async function parseQuestionPaperDeterministic(
  pdfBytes: Uint8Array,
  options: { debug?: boolean } = {}
): Promise<ParsedQuestionPaper> {
  const layout = await extractPdfLayout(pdfBytes);
  const segmentedQuestions = segmentQuestions(layout);
  const warnings: string[] = [];
  const pageByNumber = new Map(layout.pages.map((page) => [page.pageNumber, page]));
  const pageBuffers = new Map<number, Buffer>();

  async function getPageBuffer(pageNumber: number) {
    if (pageBuffers.has(pageNumber)) return pageBuffers.get(pageNumber)!;
    const buffer = await renderPdfPageToPng(pdfBytes, pageNumber);
    pageBuffers.set(pageNumber, buffer);
    return buffer;
  }

  const questions: ParsedQuestion[] = [];

  for (const segmented of segmentedQuestions) {
    const visuals: ParserVisualCandidate[] = [];
    const questionWarnings = [...segmented.warnings];

    for (const span of segmented.pageSpans) {
      const page = pageByNumber.get(span.pageNumber);
      if (!page) {
        questionWarnings.push(`Missing page layout for page ${span.pageNumber}.`);
        continue;
      }

      try {
        const detection = await detectDiagramBoxForQuestionSpan({
          pagePng: await getPageBuffer(span.pageNumber),
          page,
          span,
          pageLines: page.lines,
        });

        if (detection) {
          if (detection.confidence >= VISUAL_CONFIDENCE_FLOOR) {
            visuals.push({
              pageNumber: span.pageNumber,
              bbox: detection.bbox,
              confidence: detection.confidence,
              reason: detection.reason,
              warnings: [],
            });
          } else {
            questionWarnings.push(
              `Skipped low-confidence diagram on page ${span.pageNumber} (confidence ${detection.confidence.toFixed(2)}, ${detection.pixelCount} px, ${detection.componentCount} components).`
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "visual detection failed";
        questionWarnings.push(`Visual detection failed on page ${span.pageNumber}: ${message}`);
      }
    }

    if (visuals.length > 1) {
      questionWarnings.push("Multiple visual candidates found; only the first crop is stored in the current schema.");
    }

    questions.push({
      id: segmented.questionNumber,
      text: segmented.questionText,
      marksAvailable: segmented.marksAvailable,
      confidence: segmented.confidence,
      warnings: questionWarnings,
      segmented,
      visuals,
    });

    for (const warning of questionWarnings) {
      warnings.push(`q${segmented.questionNumber}: ${warning}`);
    }
  }

  if (questions.length === 0) {
    warnings.push("No top-level question anchors were detected.");
  }

  return {
    questions,
    warnings,
    debug: options.debug ? buildDebug(layout, questions, warnings) : undefined,
  };
}

