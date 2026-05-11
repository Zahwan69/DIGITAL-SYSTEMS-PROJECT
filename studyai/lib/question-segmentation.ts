import "server-only";

import type { PdfBox, PdfDocumentLayout, PdfLine, PdfPageLayout } from "@/lib/pdf-layout";

export type QuestionPageSpan = {
  pageNumber: number;
  box: PdfBox;
  lines: PdfLine[];
};

export type SegmentedQuestion = {
  questionNumber: string;
  questionText: string;
  marksAvailable: number;
  pageSpans: QuestionPageSpan[];
  confidence: number;
  warnings: string[];
};

type QuestionAnchor = {
  lineIndex: number;
  questionNumber: string;
  confidence: number;
};

const TOP_LEVEL_ANCHOR =
  /^\s*(?:question\s*)?(\d{1,2})(?:\s*[.)])?(?=\s|$|\([a-z]\)|[a-z]\))/i;

const MARK_PATTERNS = [
  /\[\s*(\d{1,2})(?:\s*marks?)?\s*\]\s*$/i,
  /\((\d{1,2})\s*marks?\)\s*$/i,
  /(?:^|\s)(\d{1,2})\s*marks?\s*$/i,
];

function normalizedText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripTrailingMarkAnnotation(text: string) {
  return text
    .replace(/\[\s*\d{1,2}(?:\s*marks?)?\s*\]\s*$/i, "")
    .replace(/\(\s*\d{1,2}\s*marks?\s*\)\s*$/i, "")
    .trim();
}

function isAnswerRuleLine(text: string) {
  const withoutMarks = stripTrailingMarkAnnotation(normalizedText(text));
  const compact = withoutMarks.replace(/\s+/g, "");
  return compact.length >= 8 && /^[_\-.]+$/.test(compact);
}

function isLikelyPageFurniture(line: PdfLine, pageHeight: number) {
  const text = normalizedText(line.text);
  if (!text) return true;
  if (/^\d+$/.test(text) && (line.y < pageHeight * 0.12 || line.y > pageHeight * 0.88)) {
    return true;
  }
  if (/^copyright/i.test(text)) return true;
  if (/^page\s+\d+/i.test(text)) return true;
  if (/^\[?turn over\]?$/i.test(text)) return true;
  if (/^blank page$/i.test(text)) return true;
  return false;
}

function repeatedPageFurnitureKeys(layout: PdfDocumentLayout) {
  const counts = new Map<string, number>();

  for (const page of layout.pages) {
    for (const line of page.lines) {
      const text = normalizedText(line.text).toLowerCase();
      if (text.length < 3 || text.length > 80) continue;
      if (line.y > page.height * 0.08 && line.y < page.height * 0.92) continue;
      const yBucket = Math.round((line.y / page.height) * 20);
      const key = `${text}:${yBucket}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([key]) => key)
  );
}

function isQuestionAnchor(line: PdfLine, previousQuestionNumber: number | null): QuestionAnchor | null {
  const text = normalizedText(line.text);
  const match = text.match(TOP_LEVEL_ANCHOR);
  if (!match?.[1]) return null;

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  if (previousQuestionNumber !== null && parsed <= previousQuestionNumber) return null;

  const leftAlignedEnough = line.x < 125;
  const sequential = previousQuestionNumber === null || parsed === previousQuestionNumber + 1;
  const expectedFirst = previousQuestionNumber === null && parsed === 1;
  const hasQuestionWords = /\b(describe|explain|state|calculate|suggest|identify|which|what|why|how|complete|draw|label)\b/i.test(
    text
  );
  const hasSubpartAfterNumber = /^\s*\d{1,2}\s*(?:[.)])?\s*\([a-z]\)/i.test(text);
  const looksLikeFigureCaption = /^(?:fig|figure|table|graph)\.?\s+\d/i.test(text);

  let confidence = 0.45;
  if (leftAlignedEnough) confidence += 0.25;
  if (sequential || expectedFirst) confidence += 0.2;
  if (hasQuestionWords || hasSubpartAfterNumber) confidence += 0.1;
  if (looksLikeFigureCaption) confidence -= 0.4;

  if (!leftAlignedEnough && !hasQuestionWords && !hasSubpartAfterNumber) return null;
  if (!sequential && !expectedFirst) confidence -= 0.25;
  if (confidence < 0.5) return null;

  return {
    lineIndex: -1,
    questionNumber: String(parsed),
    confidence: Math.min(1, confidence),
  };
}

function looksLikeMultipleChoice(lines: PdfLine[]) {
  const text = lines.map((line) => line.text).join(" ");
  // Cambridge MCQ rows take a few shapes:
  //   "A …  B …  C …  D …" on one line, or
  //   per-letter lines starting with a single capital A/B/C/D.
  const inlineOptions = /(^|\s)A\b[\s\S]{1,200}\bB\b[\s\S]{1,200}\bC\b[\s\S]{1,200}\bD\b/i.test(text);
  if (inlineOptions) return true;

  const optionLetters = new Set<string>();
  for (const line of lines) {
    const match = line.text.trim().match(/^([A-D])\b/);
    if (match?.[1]) optionLetters.add(match[1].toUpperCase());
  }
  return optionLetters.size >= 3 && optionLetters.has("A") && optionLetters.has("B");
}

function extractMarks(lines: PdfLine[]) {
  const combined = lines.map((line) => line.text).join(" ");
  const totalMatch = combined.match(/\btotal\s*:?\s*(\d{1,2})\b/i);
  if (totalMatch?.[1]) {
    const total = Number.parseInt(totalMatch[1], 10);
    if (Number.isFinite(total) && total > 0 && total <= 80) return total;
  }

  let total = 0;

  for (const line of lines) {
    const text = normalizedText(line.text);
    if (/turn over|blank page/i.test(text)) continue;
    for (const pattern of MARK_PATTERNS) {
      const match = text.match(pattern);
      if (!match?.[1]) continue;
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value) && value > 0 && value <= 30) {
        total += value;
        break;
      }
    }
  }

  return total;
}

function stripLeadingQuestionNumber(text: string, questionNumber: string) {
  return text
    .replace(new RegExp(`^\\s*(?:question\\s*)?${questionNumber}(?:\\s*[.)])?\\s*`, "i"), "")
    .trim();
}

function buildPageSpans(
  lines: PdfLine[],
  pages: PdfPageLayout[],
  nextAnchorLine: PdfLine | null
): QuestionPageSpan[] {
  const grouped = new Map<number, PdfLine[]>();
  for (const line of lines) {
    grouped.set(line.pageNumber, [...(grouped.get(line.pageNumber) ?? []), line]);
  }

  const pageByNumber = new Map(pages.map((page) => [page.pageNumber, page]));
  const firstPage = Math.min(...lines.map((line) => line.pageNumber));

  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([pageNumber, pageLines]) => {
      const page = pageByNumber.get(pageNumber);
      if (!page) return [];
      const sortedLines = [...pageLines].sort((a, b) => a.y - b.y);
      const firstLine = sortedLines[0];
      const lastLine = sortedLines[sortedLines.length - 1];
      if (!firstLine || !lastLine) return [];

      const top = pageNumber === firstPage ? Math.max(0, firstLine.y - 4) : 0;
      let bottom = page.height;

      if (nextAnchorLine?.pageNumber === pageNumber) {
        bottom = Math.max(top + 1, nextAnchorLine.y - 6);
      } else if (nextAnchorLine && nextAnchorLine.pageNumber > pageNumber) {
        bottom = page.height;
      } else if (!nextAnchorLine) {
        bottom = page.height * 0.96;
      } else {
        bottom = Math.min(page.height, Math.max(lastLine.y + lastLine.height + 24, top + 1));
      }

      return [
        {
          pageNumber,
          box: {
            x: 0,
            y: top,
            width: page.width,
            height: Math.max(1, bottom - top),
          },
          lines: pageLines,
        },
      ];
    });
}

function contentLines(layout: PdfDocumentLayout) {
  const pageHeight = new Map(layout.pages.map((page) => [page.pageNumber, page.height]));
  const repeatedKeys = repeatedPageFurnitureKeys(layout);

  return layout.lines.filter((line) => {
    const height = pageHeight.get(line.pageNumber) ?? 999;
    if (isLikelyPageFurniture(line, height)) return false;

    const text = normalizedText(line.text).toLowerCase();
    const yBucket = Math.round((line.y / height) * 20);
    return !repeatedKeys.has(`${text}:${yBucket}`);
  });
}

export function segmentQuestions(layout: PdfDocumentLayout): SegmentedQuestion[] {
  const lines = contentLines(layout);
  const anchors: QuestionAnchor[] = [];
  let previousQuestionNumber: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const anchor = isQuestionAnchor(lines[index], previousQuestionNumber);
    if (!anchor) continue;
    anchor.lineIndex = index;
    anchors.push(anchor);
    previousQuestionNumber = Number.parseInt(anchor.questionNumber, 10);
  }

  if (anchors.length === 0) {
    const text = lines.map((line) => line.text).join("\n").trim();
    let marksAvailable = extractMarks(lines);
    if (marksAvailable <= 0 && looksLikeMultipleChoice(lines)) marksAvailable = 1;
    return text
      ? [
          {
            questionNumber: "1",
            questionText: text,
            marksAvailable,
            pageSpans: buildPageSpans(lines, layout.pages, null),
            confidence: 0.2,
            warnings: [
              "No question anchors found; treated the document as one question.",
              ...(marksAvailable > 0 ? [] : ["Marks could not be confidently extracted."]),
            ],
          },
        ]
      : [];
  }

  const questions: SegmentedQuestion[] = [];
  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const nextAnchor = anchors[index + 1] ?? null;
    const nextAnchorLine = nextAnchor ? lines[nextAnchor.lineIndex] ?? null : null;
    const questionLines = lines.slice(anchor.lineIndex, nextAnchor?.lineIndex ?? lines.length);
    if (questionLines.length === 0) continue;

    const text = questionLines
      .map((line, lineIndex) =>
        lineIndex === 0 ? stripLeadingQuestionNumber(line.text, anchor.questionNumber) : line.text
      )
      .map((text) => (isAnswerRuleLine(text) ? "" : stripTrailingMarkAnnotation(text)))
      .map(normalizedText)
      .filter(Boolean)
      .join("\n")
      .trim();

    let marksAvailable = extractMarks(questionLines);
    const isMultipleChoice = looksLikeMultipleChoice(questionLines);
    if (marksAvailable <= 0 && isMultipleChoice) {
      marksAvailable = 1;
    }
    const warnings = [...(anchor.confidence < 0.7 ? ["Low-confidence question anchor."] : [])];
    if (marksAvailable <= 0) warnings.push("Marks could not be confidently extracted.");
    if (new Set(questionLines.map((line) => line.pageNumber)).size > 1) {
      warnings.push("Question continues across a page break.");
    }

    questions.push({
      questionNumber: anchor.questionNumber,
      questionText: text || "Question text unavailable",
      marksAvailable,
      pageSpans: buildPageSpans(questionLines, layout.pages, nextAnchorLine),
      confidence: anchor.confidence,
      warnings,
    });
  }

  return questions;
}
