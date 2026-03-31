import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
];

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message: "GEMINI_API_KEY is missing in .env.local",
      },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const errors: string[] = [];

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Reply with exactly: OK");
      const text = result.response.text().trim();

      return NextResponse.json({
        ok: true,
        message: "Gemini connection is working.",
        model: modelName,
        responsePreview: text,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";
      errors.push(`${modelName}: ${message}`);
    }
  }

  return NextResponse.json(
    {
      ok: false,
      message: "Gemini connection failed for all test models.",
      triedModels: CANDIDATE_MODELS,
      error: errors[errors.length - 1] ?? "No error details available",
    },
    { status: 500 }
  );
}
