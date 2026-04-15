"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

type MarkResult = {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  xpEarned: number;
  newStreak: number;
};

type Props = {
  questionId: string;
  marksAvailable: number;
};

function scoreColour(pct: number): string {
  if (pct >= 80) return "text-green-700";
  if (pct >= 50) return "text-yellow-700";
  return "text-red-700";
}

export function AnswerForm({ questionId, marksAvailable }: Props) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarkResult | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!answer.trim()) return;

    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError("Session expired. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ questionId, answerText: answer }),
      });

      const data = (await response.json()) as MarkResult & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Marking failed. Please try again.");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${scoreColour(result.percentage)}`}>
            {result.score} / {result.maxScore}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            +{result.xpEarned} XP
            {result.newStreak > 1 ? ` · 🔥 ${result.newStreak}-day streak` : ""}
          </span>
        </div>

        <p className="text-sm text-slate-700">{result.feedback}</p>

        {result.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Strengths
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
              {result.strengths.map((s, i) => (
                <li key={`${s}-${i}`}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {result.improvements.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              To improve
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
              {result.improvements.map((imp, i) => (
                <li key={`${imp}-${i}`}>{imp}</li>
              ))}
            </ul>
          </div>
        )}

        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
            Show model answer
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 pt-1 text-xs text-slate-700">
            {result.modelAnswer}
          </p>
        </details>

        <button
          type="button"
          className="text-xs text-slate-500 underline hover:text-slate-700"
          onClick={() => {
            setResult(null);
            setAnswer("");
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        Attempt this question
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={`Write your answer here (question is worth ${marksAvailable} mark${
          marksAvailable !== 1 ? "s" : ""
        })...`}
        rows={5}
        className="resize-y text-sm"
        disabled={loading}
      />

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !answer.trim()}>
          {loading ? "Marking with AI..." : "Submit for marking"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setAnswer("");
            setError(null);
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
