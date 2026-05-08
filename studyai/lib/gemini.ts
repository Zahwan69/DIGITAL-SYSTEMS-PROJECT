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

export function buildAnalysePrompt(): string {
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
      "diagramPage": 4
    }
  ]
}

Rules:
- No markdown, no explanation, no code fences.
- Include every visible question in order.
- marksAvailable must be a number.
- difficulty must be one of easy, medium, hard.
- If unsure about marking scheme, return null.
- hasDiagram must be true when the question depends on a visual element (figure, graph, circuit, table, photo), otherwise false.
- diagramPage must be the 1-indexed page number containing that visual when hasDiagram is true.
- Omit diagramPage when hasDiagram is false.`;
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
