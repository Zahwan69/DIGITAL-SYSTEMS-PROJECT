import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { generateGeminiContent } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

    const body = (await request.json()) as { questionId?: string };
    const questionId = body.questionId?.trim();
    if (!questionId) {
      return NextResponse.json({ error: "questionId is required." }, { status: 400 });
    }

    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .select("question_text, marks_available, topic")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const prompt = `You are a Cambridge revision tutor helping a student think through an exam question.

Question: ${question.question_text}
Marks available: ${question.marks_available}
Topic: ${question.topic ?? "General"}

Give ONE short Socratic hint to guide the student's thinking.

Rules:
- Do NOT give the answer or any part of the answer.
- Do NOT quote from or reference a marking scheme.
- Either ask a guiding question OR point to the relevant concept or method.
- Maximum 2 sentences.
- Return ONLY plain text. No JSON, no markdown, no bullet points.`;

    const { result } = await generateGeminiContent([{ text: prompt }]);
    const hint = result.response.text().trim();

    return NextResponse.json({ hint });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
