"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AnswerForm } from "@/components/AnswerForm";
import type { MarkResult } from "@/components/AnswerForm";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  image_url: string | null;
  has_diagram: boolean;
};

type PastAttempt = {
  id: string;
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  created_at: string;
};

type PaperResponse = {
  paper?: Paper;
  questions?: Question[];
  results?: Record<string, MarkResult>;
  pastAttempts?: Record<string, PastAttempt[]>;
  error?: string;
};

type ResultsSummaryProps = {
  results: Record<string, MarkResult>;
  questions: Question[];
};

const difficultyColour: Record<string, string> = {
  easy: "bg-surface-alt text-text",
  medium: "bg-surface-alt text-text",
  hard: "bg-surface-alt text-text",
};

function scoreColour(pct: number): string {
  if (pct >= 50) return "text-text";
  return "text-danger";
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
      <figcaption className="text-xs text-text-muted">Original paper visual</figcaption>
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
      <p className="text-sm font-semibold text-text">+{totalXp} total XP earned</p>
      <p className="text-sm text-text-muted">
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
  const [pastAttempts, setPastAttempts] = useState<Record<string, PastAttempt[]>>({});

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch(`/api/papers/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await response.json().catch(() => ({}))) as PaperResponse;

      if (!response.ok || !data.paper) {
        setError(data.error ?? "Paper not found.");
        setLoading(false);
        return;
      }

      setPaper(data.paper);
      setQuestions(data.questions ?? []);
      setResults(data.results ?? {});
      setPastAttempts(data.pastAttempts ?? {});
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
        <p className="text-sm text-text-muted">Loading paper...</p>
      </AppShell>
    );
  }

  if (error || !paper) {
    return (
      <AppShell>
        <p className="text-sm text-danger">{error ?? "Something went wrong."}</p>
        <Link href="/papers" className="mt-2 text-sm text-text hover:underline">
          Back to My Papers
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <Link href="/papers" className="text-sm text-text hover:underline">
            ← My Papers
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-text">
            {paper.subject_name} — {paper.syllabus_code}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {paper.level} {paper.year ? `· ${paper.year}` : ""} ·{" "}
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-5 text-sm text-text-muted">
            No questions were extracted for this paper. Try uploading a clearer question paper PDF
            or check the parser output before using it for practice.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base text-text">
                      Q{q.question_number}
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

                  <p className="whitespace-pre-wrap text-sm text-text">
                    {q.question_text}
                  </p>

                  <AnswerForm
                    questionId={q.id}
                    questionText={q.question_text}
                    marksAvailable={q.marks_available}
                    onSubmitted={(result) => handleSubmitted(q.id, result)}
                    revealed={revealed}
                    existingResult={results[q.id] ?? null}
                  />

                  {(pastAttempts[q.id] ?? []).length > 0 && (
                    <details className="mt-3 rounded-lg border border-border">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-muted hover:text-text">
                        Past attempts ({(pastAttempts[q.id] ?? []).length})
                      </summary>
                      <ul className="divide-y divide-border px-3 pb-3">
                        {(pastAttempts[q.id] ?? []).map((attempt) => (
                          <li key={attempt.id} className="py-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold ${scoreColour(attempt.percentage)}`}>
                                {attempt.score}/{attempt.max_score} · {attempt.percentage}%
                              </span>
                              <span className="text-xs text-text-muted">
                                {new Date(attempt.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                              {attempt.feedback}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {questions.length > 0 && (
          <div className="sticky bottom-4 mt-6">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-md">
              {!revealed ? (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-text-muted">
                    {Object.keys(results).length} / {questions.length} answered
                  </p>
                  <Button type="button" onClick={() => setRevealed(true)}>
                    Finish & see results
                  </Button>
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
