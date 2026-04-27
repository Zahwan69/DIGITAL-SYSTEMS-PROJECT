"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AnswerForm } from "@/components/AnswerForm";
import type { MarkResult } from "@/components/AnswerForm";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type Paper = {
  id: string;
  subject_name: string;
  syllabus_code: string;
  year: number | null;
  level: string;
  question_count: number;
  created_at: string;
};

type Question = {
  id: string;
  question_number: string;
  question_text: string;
  topic: string | null;
  marks_available: number;
  difficulty: "easy" | "medium" | "hard";
  marking_scheme: string | null;
  image_url: string | null;
  has_diagram: boolean;
};

type ResultsSummaryProps = {
  results: Record<string, MarkResult>;
  questions: Question[];
};

const difficultyColour: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
};

function scoreColour(pct: number): string {
  if (pct >= 80) return "text-green-700";
  if (pct >= 50) return "text-yellow-700";
  return "text-red-700";
}

function InlineQuestionImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <p className="text-xs text-text-muted">Diagram unavailable.</p>;
  }
  return (
    <figure className="space-y-1">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={800}
        loading="lazy"
        unoptimized
        className="max-h-96 w-full rounded-lg border border-border bg-surface object-contain"
        onError={() => setFailed(true)}
      />
      <figcaption className="text-xs text-text-muted">From the original paper</figcaption>
    </figure>
  );
}

function ResultsSummary({ results, questions }: ResultsSummaryProps) {
  const answeredCount = Object.keys(results).length;
  const entries = Object.values(results);
  const totalScore = entries.reduce((sum, r) => sum + r.score, 0);
  const totalMax = entries.reduce((sum, r) => sum + r.maxScore, 0);
  const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const totalXp = entries.reduce((sum, r) => sum + r.xpEarned, 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className={`text-sm font-semibold ${scoreColour(percentage)}`}>
        {totalScore}/{totalMax} · {percentage}%
      </p>
      <p className="text-sm font-semibold text-indigo-700">+{totalXp} total XP earned</p>
      <p className="text-sm text-slate-600">
        {answeredCount} of {questions.length} questions answered
      </p>
    </div>
  );
}

export default function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, MarkResult>>({});
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: paperData, error: paperError } = await supabase
        .from("past_papers")
        .select("*")
        .eq("id", id)
        .single();

      if (paperError || !paperData) {
        setError("Paper not found.");
        setLoading(false);
        return;
      }

      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("*")
        .eq("paper_id", id)
        .order("question_number", { ascending: true });

      if (questionError) {
        setError(questionError.message);
        setLoading(false);
        return;
      }

      const loadedQuestions = (questionData ?? []) as Question[];
      const questionIds = loadedQuestions.map((q) => q.id);
      const resultByQuestion: Record<string, MarkResult> = {};
      if (questionIds.length > 0) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from("attempts")
          .select(
            "question_id, answer_text, answer_image_path, score, max_score, percentage, feedback, strengths, improvements, model_answer, xp_earned, created_at"
          )
          .eq("user_id", user.id)
          .in("question_id", questionIds)
          .order("created_at", { ascending: false });

        if (attemptsError) {
          setError(attemptsError.message);
          setLoading(false);
          return;
        }

        const signedUrlByPath = new Map<string, string>();
        for (const attempt of attemptsData ?? []) {
          if (!attempt.answer_image_path || signedUrlByPath.has(attempt.answer_image_path)) {
            continue;
          }
          const { data: signedData } = await supabase.storage
            .from("answer-images")
            .createSignedUrl(attempt.answer_image_path, 3600);
          if (signedData?.signedUrl) {
            signedUrlByPath.set(attempt.answer_image_path, signedData.signedUrl);
          }
        }

        for (const attempt of attemptsData ?? []) {
          if (resultByQuestion[attempt.question_id]) continue;
          resultByQuestion[attempt.question_id] = {
            score: attempt.score ?? 0,
            maxScore: attempt.max_score ?? 0,
            percentage: attempt.percentage ?? 0,
            feedback: attempt.feedback ?? "",
            strengths: attempt.strengths ?? [],
            improvements: attempt.improvements ?? [],
            modelAnswer: attempt.model_answer ?? "",
            xpEarned: attempt.xp_earned ?? 0,
            newStreak: 1,
            answerText: attempt.answer_text ?? "",
            answerImagePath: attempt.answer_image_path,
            answerImageUrl: attempt.answer_image_path
              ? signedUrlByPath.get(attempt.answer_image_path) ?? null
              : null,
          };
        }
      }

      setPaper(paperData as Paper);
      setQuestions(loadedQuestions);
      setResults(resultByQuestion);
      setLoading(false);
    }

    void load();
  }, [id, router]);

  function handleSubmitted(questionId: string, result: MarkResult) {
    setResults((prev) => ({ ...prev, [questionId]: result }));
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-slate-500">Loading paper...</p>
      </AppShell>
    );
  }

  if (error || !paper) {
    return (
      <AppShell>
        <p className="text-sm text-red-700">{error ?? "Something went wrong."}</p>
        <Link href="/papers" className="mt-2 text-sm text-indigo-600 hover:underline">
          Back to My Papers
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <Link href="/papers" className="text-sm text-indigo-600 hover:underline">
            ← My Papers
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {paper.subject_name} — {paper.syllabus_code}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {paper.level} {paper.year ? `· ${paper.year}` : ""} ·{" "}
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {questions.length === 0 ? (
          <p className="text-sm text-slate-500">No questions found for this paper.</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      Q{q.question_number}
                      {q.topic ? (
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          {q.topic}
                        </span>
                      ) : null}
                    </CardTitle>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          difficultyColour[q.difficulty] ?? difficultyColour.medium
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      <Badge variant="secondary">
                        {q.marks_available} mark{q.marks_available !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {q.image_url ? (
                    <InlineQuestionImage
                      src={q.image_url}
                      alt={`Diagram for question ${q.question_number}`}
                    />
                  ) : null}

                  <p className="whitespace-pre-wrap text-sm text-slate-800">
                    {q.question_text}
                  </p>

                  {q.marking_scheme && (
                    <details className="rounded-lg border border-slate-200 bg-slate-50">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                        Show marking scheme
                      </summary>
                      <p className="whitespace-pre-wrap px-3 pb-3 pt-1 text-xs text-slate-700">
                        {q.marking_scheme}
                      </p>
                    </details>
                  )}

                  <AnswerForm
                    questionId={q.id}
                    marksAvailable={q.marks_available}
                    onSubmitted={(result) => handleSubmitted(q.id, result)}
                    revealed={revealed}
                    existingResult={results[q.id] ?? null}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div className="sticky bottom-4 mt-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
              {!revealed ? (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    {Object.keys(results).length} / {questions.length} answered
                  </p>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Finish & see results
                  </button>
                </div>
              ) : (
                <ResultsSummary results={results} questions={questions} />
              )}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
