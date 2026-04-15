"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AnswerForm } from "@/components/AnswerForm";
import type { MarkResult } from "@/components/AnswerForm";
import { Navbar } from "@/components/Navbar";
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

      setPaper(paperData as Paper);
      setQuestions((questionData ?? []) as Question[]);
      setLoading(false);
    }

    void load();
  }, [id, router]);

  function handleSubmitted(questionId: string, result: MarkResult) {
    setResults((prev) => ({ ...prev, [questionId]: result }));
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
          <p className="text-sm text-slate-500">Loading paper...</p>
        </main>
      </>
    );
  }

  if (error || !paper) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
          <p className="text-sm text-red-700">{error ?? "Something went wrong."}</p>
          <Link href="/papers" className="mt-2 text-sm text-indigo-600 hover:underline">
            Back to My Papers
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
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
    </>
  );
}
