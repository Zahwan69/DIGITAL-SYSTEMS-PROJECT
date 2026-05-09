"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { ClipboardList } from "lucide-react";

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

function AssignmentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject")?.trim() ?? "";
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                      <Link href={`/papers/${r.paper_id}`} className="text-text hover:underline">
                        Open
                      </Link>
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
