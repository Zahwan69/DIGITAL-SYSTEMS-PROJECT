"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { ClipboardList, Eye } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  class_id: string;
  paper_id: string;
  title: string;
  due_date: string | null;
  created_at: string;
  class_name: string;
  paper: { subject_name: string; syllabus_code: string } | null;
  attempt_summary: {
    member_count: number;
    question_count: number;
    attempted_student_count: number;
    attempt_count: number;
    average_percentage: number | null;
    recent_attempts: Array<{
      id: string;
      student_name: string;
      question_number: string;
      score: number;
      max_score: number;
      percentage: number;
      created_at: string;
    }>;
  };
};

type DetailedAttempt = {
  id: string;
  student_name: string;
  question: {
    question_number: string;
    question_text: string;
    topic: string | null;
    marks_available: number;
    difficulty: string | null;
  };
  answer_text: string;
  answer_image_url: string | null;
  needs_teacher_review: boolean;
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  model_answer: string;
  created_at: string;
};

type ReviewState = {
  loading: boolean;
  error: string | null;
  attempts: DetailedAttempt[];
};

function AssignmentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject")?.trim() ?? "";
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewByAssignment, setReviewByAssignment] = useState<Record<string, ReviewState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push("/auth/login");
      return;
    }
    const res = await fetch(`/api/teacher/assignments-list${q}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load.");
      setLoading(false);
      return;
    }
    setRows(json.assignments ?? []);
    setLoading(false);
  }, [q, router]);

  const loadReview = useCallback(
    async (assignmentId: string) => {
      const existing = reviewByAssignment[assignmentId];
      if (existing && !existing.error) {
        setReviewByAssignment((current) => {
          const next = { ...current };
          delete next[assignmentId];
          return next;
        });
        return;
      }

      setReviewByAssignment((current) => ({
        ...current,
        [assignmentId]: { loading: true, error: null, attempts: [] },
      }));

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push("/auth/login");
        return;
      }

      const res = await fetch(`/api/teacher/assignments/${assignmentId}/attempts`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setReviewByAssignment((current) => ({
          ...current,
          [assignmentId]: {
            loading: false,
            error: json.error ?? "Failed to load attempts.",
            attempts: [],
          },
        }));
        return;
      }

      setReviewByAssignment((current) => ({
        ...current,
        [assignmentId]: {
          loading: false,
          error: null,
          attempts: json.attempts ?? [],
        },
      }));
    },
    [reviewByAssignment, router]
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">Assignments</h1>
          <p className="mt-1 text-sm text-text-muted">
            All assignments in your current subject scope, with student attempt progress.
          </p>
        </div>
        {loading && <p className="text-sm text-text-muted">Loading...</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No assignments yet"
            description="Assignments appear when you create them from a class page."
            action={
              <Button asChild variant="secondary">
                <Link href="/teacher/classes">Browse classes</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-xs font-medium uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Attempted</th>
                  <th className="px-4 py-3">Avg</th>
                  <th className="px-4 py-3">Paper</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent-soft/40">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-text">{r.title}</p>
                      {r.paper ? (
                        <p className="text-xs text-text-muted">
                          {r.paper.subject_name} ({r.paper.syllabus_code})
                        </p>
                      ) : null}
                      {r.attempt_summary.recent_attempts.length > 0 ? (
                        <details className="mt-2 rounded-md border border-border bg-surface-alt">
                          <summary className="cursor-pointer px-2 py-1 text-xs font-medium text-text-muted hover:text-text">
                            View attempt scores
                          </summary>
                          <ul className="divide-y divide-border px-2 pb-1">
                            {r.attempt_summary.recent_attempts.map((attempt) => (
                              <li
                                key={attempt.id}
                                className="grid grid-cols-[1fr_auto_auto] gap-2 py-1.5 text-xs"
                              >
                                <span className="truncate text-text">{attempt.student_name}</span>
                                <span className="text-text-muted">Q{attempt.question_number}</span>
                                <span className="font-medium text-text">
                                  {attempt.score}/{attempt.max_score} · {attempt.percentage}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      {reviewByAssignment[r.id] ? (
                        <div className="mt-3 rounded-lg border border-border bg-surface p-3">
                          {reviewByAssignment[r.id].loading ? (
                            <p className="text-xs text-text-muted">Loading student answers...</p>
                          ) : reviewByAssignment[r.id].error ? (
                            <p className="text-xs text-danger">{reviewByAssignment[r.id].error}</p>
                          ) : reviewByAssignment[r.id].attempts.length === 0 ? (
                            <p className="text-xs text-text-muted">No student answers yet.</p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                  Student answer review
                                </p>
                                <p className="text-xs text-text-muted">
                                  {reviewByAssignment[r.id].attempts.length} attempts
                                </p>
                              </div>
                              {reviewByAssignment[r.id].attempts.map((attempt) => (
                                <article key={attempt.id} className="rounded-md border border-border bg-surface-alt p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium text-text">{attempt.student_name}</p>
                                      <p className="text-xs text-text-muted">
                                        Q{attempt.question.question_number}
                                        {attempt.question.topic ? ` / ${attempt.question.topic}` : ""}
                                      </p>
                                    </div>
                                    <p className="text-xs font-medium tabular-nums text-text">
                                      {attempt.score}/{attempt.max_score} / {attempt.percentage}%
                                    </p>
                                  </div>
                                  {attempt.needs_teacher_review ? (
                                    <span className="mt-2 inline-flex rounded-full border border-warning/40 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-text">
                                      Teacher review flagged
                                    </span>
                                  ) : null}
                                  <div className="mt-2 space-y-2 text-xs">
                                    <div>
                                      <p className="font-medium text-text-muted">Question</p>
                                      <p className="mt-0.5 line-clamp-3 text-text">{attempt.question.question_text}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-text-muted">Student answer</p>
                                      <p className="mt-0.5 whitespace-pre-wrap text-text">
                                        {attempt.answer_text || "No written answer submitted."}
                                      </p>
                                      {attempt.answer_image_url ? (
                                        <a
                                          href={attempt.answer_image_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-1 inline-flex font-medium text-text hover:underline"
                                        >
                                          Open answer attachment
                                        </a>
                                      ) : null}
                                    </div>
                                    <div>
                                      <p className="font-medium text-text-muted">AI feedback</p>
                                      <p className="mt-0.5 text-text">{attempt.feedback}</p>
                                    </div>
                                    <details>
                                      <summary className="cursor-pointer font-medium text-text-muted hover:text-text">
                                        Strengths, improvements, and model answer
                                      </summary>
                                      <div className="mt-1 space-y-1 text-text">
                                        <p>
                                          <span className="font-medium">Strengths:</span>{" "}
                                          {attempt.strengths.length ? attempt.strengths.join(", ") : "None recorded."}
                                        </p>
                                        <p>
                                          <span className="font-medium">Improvements:</span>{" "}
                                          {attempt.improvements.length
                                            ? attempt.improvements.join(", ")
                                            : "None recorded."}
                                        </p>
                                        <p>
                                          <span className="font-medium">Model answer:</span> {attempt.model_answer}
                                        </p>
                                      </div>
                                    </details>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-text-muted">{r.class_name}</td>
                    <td className="px-4 py-3 align-top tabular-nums text-text-muted">
                      {r.due_date ? new Date(r.due_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-text-muted">
                      {r.attempt_summary.attempted_student_count}/{r.attempt_summary.member_count}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-text-muted">
                      {r.attempt_summary.average_percentage !== null
                        ? `${r.attempt_summary.average_percentage}%`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={r.attempt_summary.attempt_count === 0}
                          onClick={() => void loadReview(r.id)}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          {reviewByAssignment[r.id] ? "Hide" : "Review"}
                        </Button>
                        <Link href={`/papers/${r.paper_id}`} className="text-xs font-medium text-text hover:underline">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function TeacherAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-text-muted">Loading...</p>
        </AppShell>
      }
    >
      <AssignmentsInner />
    </Suspense>
  );
}
