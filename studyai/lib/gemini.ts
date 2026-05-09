import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

const geminiApiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Tried in order. Google retires aliases like `gemini-1.5-flash-latest` on v1beta;
 * use stable IDs from https://ai.google.dev/gemini-api/docs/models
 *
 * Override with GEMINI_MODEL=e.g. gemini-2.0-flash (tried first, then this list).
 */
const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export function getGeminiCandidateModelNames(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  if (!preferred) return [...DEFAULT_MODEL_CANDIDATES];
  const rest = DEFAULT_MODEL_CANDIDATES.filter((m) => m !== preferred);
  return [preferred, ...rest];
}

const primaryModel = getGeminiCandidateModelNames()[0]!;

export const geminiFlash = genAI.getGenerativeModel({
  model: primaryModel,
});

export async function generateGeminiContent(parts: Array<string | Part>) {
  const errors: string[] = [];
  const models = getGeminiCandidateModelNames();

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      return { result, modelName };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini error";
      errors.push(`${modelName}: ${message}`);
    }
  }

  throw new Error(
    `Gemini generateContent failed for every model tried:\n${errors.map((e) => `  • ${e}`).join("\n")}`
  );
}

export type MarkInput = {
  questionText: string;
  markingScheme: string | null;
  marksAvailable: number;
  answerText: string;
  answerImage?: { mimeType: string; base64: string } | null;
};

export function buildAnalysePrompt(options: { hasMarkScheme?: boolean } = {}): string {
  const markSchemeRule = options.hasMarkScheme
    ? "- An official mark scheme PDF is included after the question paper. Use it to populate markingScheme for each matching question. Keep the wording concise but specific enough for marking."
    : "- No official mark scheme PDF is included. If unsure about marking scheme, return null.";

  return `You are extracting Cambridge exam questions from a PDF.
Return ONLY valid JSON with this exact shape:
{
  "questions": [
    {
      "questionNumber": "1(a)",
      "questionText": "full question text",
      "topic": "specific Cambridge syllabus topic name",
      "marksAvailable": 4,
      "difficulty": "easy|medium|hard",
      "markingScheme": "marking guidance or null",
      "hasDiagram": true,
      "diagramPage": 4,
      "diagramBoundingBox": [y_min, x_min, y_max, x_max]
    }
  ]
}

Rules:
- No markdown, no explanation, no code fences.
- Include every visible question in order.
- marksAvailable must be a number.
- difficulty must be one of easy, medium, hard.
${markSchemeRule}
- hasDiagram must be true when the question depends on a visual element (figure, graph, circuit, diagram, photo), otherwise false. Tables of plain text are NOT diagrams.
- diagramPage must be the 1-indexed page number containing that visual when hasDiagram is true.
- diagramBoundingBox: when hasDiagram is true, return a tight bounding box around just the diagram (NOT the question text), normalized to 0-1000 of the page. Format: [y_min, x_min, y_max, x_max], where 0,0 is top-left and 1000,1000 is bottom-right of the page. Pad ~2-3% so the figure isn't clipped. If you cannot locate the diagram precisely, omit diagramBoundingBox entirely (do not guess; do not return [0,0,1000,1000]).
- Omit diagramPage and diagramBoundingBox when hasDiagram is false.`;
}

export function buildMarkPrompt(input: MarkInput): string {
  const markingSchemeSection = input.markingScheme
    ? `Marking scheme:\n${input.markingScheme}`
    : "Marking scheme: Not provided - use your knowledge of Cambridge mark schemes.";

  return `You are a Cambridge examiner. Mark the student's answer strictly and fairly.

Question: ${input.questionText}
Marks available: ${input.marksAvailable}
${markingSchemeSection}

Student's written answer:
${input.answerText || "(no text provided)"}

The student's answer may include written text plus one attachment: a photograph/image or a PDF of their working (handwriting, a labelled diagram, a graph plotted on paper, or a hand-drawn figure). Mark the combined answer. If a feature is only legible in the attachment, mark from the attachment. If the text and attachment contradict, prefer the more complete representation in the attachment. Penalise illegibility only if the legible portion is itself wrong.

Marking rules:
- Award marks only for answer content that directly answers the question.
- Do not give credit for generic or evasive answers such as "shows answer", "shown above", "the answer", "I don't know", or copied question text unless they also include the correct answer.
- For multiple-choice answers, a single letter such as A, B, C, or D is a valid answer only if it matches the correct option from the question or mark scheme.

Return ONLY valid JSON with no markdown fences:
{
  "score": <integer between 0 and ${input.marksAvailable}>,
  "feedback": "<2-3 sentence overall comment on the answer>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "model_answer": "<a complete model answer a top student would write>"
}`;
}

export async function markAnswer(input: MarkInput): Promise<{ text: string; modelName: string }> {
  const parts: Part[] = [{ text: buildMarkPrompt(input) }];
  if (input.answerImage) {
    parts.push({
      inlineData: {
        mimeType: input.answerImage.mimeType,
        data: input.answerImage.base64,
      },
    });
  }

  const { result, modelName } = await generateGeminiContent(parts);
  return { text: result.response.text(), modelName };
}
