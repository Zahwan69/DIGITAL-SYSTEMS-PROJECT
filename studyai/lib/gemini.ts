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
