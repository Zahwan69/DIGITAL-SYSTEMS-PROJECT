"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type Paper = {
  id: string;
  subject_name: string;
  syllabus_code: string;
  year: number | null;
  level: string;
  question_count: number | null;
  created_at: string;
};

type AttemptScore = {
  id: string;
  questionNumber: string;
  score: number;
  maxScore: number;
  percentage: number;
  createdAt: string;
};

type AttemptSummary = {
  attemptedQuestions: number;
  totalQuestions: number;
  score: number;
  maxScore: number;
  percentage: number | null;
  lastAttemptedAt: string | null;
  attempts: AttemptScore[];
};

type AssignedPaper = {
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
  className: string;
  dueDate: string | null;
  assignedAt: string;
  paper: Paper;
  summary: AttemptSummary;
};

type UploadedPaper = {
  paper: Paper;
  summary: AttemptSummary;
};

type PapersResponse = {
  assignedPapers?: AssignedPaper[];
  uploadedPapers?: UploadedPaper[];
  error?: string;
};

function scoreLabel(summary: AttemptSummary) {
  if (summary.percentage === null || summary.maxScore === 0) return "Not attempted";
  return `${summary.score}/${summary.maxScore} (${summary.percentage}%)`;
}

function paperSubtitle(paper: Paper) {
  return `${paper.syllabus_code}${paper.year ? ` · ${paper.year}` : ""} · ${paper.level}`;
}

function AttemptDetails({ summary }: { summary: AttemptSummary }) {
  if (summary.attempts.length === 0) {
    return <p className="mt-3 text-xs text-text-muted">No attempts yet.</p>;
  }

  return (
    <details className="mt-3 rounded-lg border border-border bg-surface-alt">
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-muted hover:text-text">
        Attempt scores
      </summary>
      <ul className="divide-y divide-border px-3 pb-2">
        {summary.attempts.map((attempt) => (
          <li key={attempt.id} className="flex items-center justify-between gap-3 py-2 text-xs">
            <span className="text-text">Q{attempt.questionNumber}</span>
            <span className="font-medium text-text">
              {attempt.score}/{attempt.maxScore} · {attempt.percentage}%
            </span>
            <span className="text-text-muted">
              {new Date(attempt.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function PaperCard({
  paper,
  summary,
  meta,
}: {
  paper: Paper;
  summary: AttemptSummary;
  meta?: React.ReactNode;
}) {
  const totalQuestions = summary.totalQuestions || paper.question_count || 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{paper.subject_name}</CardTitle>
            <CardDescription>{paperSubtitle(paper)}</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/papers/${paper.id}`}>Open</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {meta}
        <div className="grid gap-2 rounded-lg border border-border bg-surface-alt p-3 text-xs text-text-muted sm:grid-cols-3">
          <div>
            <p className="font-medium text-text">{summary.attemptedQuestions}/{totalQuestions}</p>
            <p>attempted</p>
          </div>
          <div>
            <p className="font-medium text-text">{scoreLabel(summary)}</p>
            <p>current score</p>
          </div>
          <div>
            <p className="font-medium text-text">
              {summary.lastAttemptedAt
                ? new Date(summary.lastAttemptedAt).toLocaleDateString()
                : "—"}
            </p>
            <p>last attempt</p>
          </div>
        </div>
        <AttemptDetails summary={summary} />
      </CardContent>
    </Card>
  );
}

export default function MyPapersPage() {
  const router = useRouter();
  const [assignedPapers, setAssignedPapers] = useState<AssignedPaper[]>([]);
  const [uploadedPapers, setUploadedPapers] = useState<UploadedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const assignedByClass = useMemo(() => {
    return assignedPapers.reduce<Record<string, AssignedPaper[]>>((acc, item) => {
      if (!acc[item.className]) acc[item.className] = [];
      acc[item.className]!.push(item);
      return acc;
    }, {});
  }, [assignedPapers]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/papers", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await response.json().catch(() => ({}))) as PapersResponse;

      if (!response.ok) {
        setError(data.error ?? "Failed to load papers.");
        setLoading(false);
        return;
      }

      setAssignedPapers(data.assignedPapers ?? []);
      setUploadedPapers(data.uploadedPapers ?? []);
      setLoading(false);
    }

    void load();
  }, [router]);

  const hasAnyPaper = assignedPapers.length > 0 || uploadedPapers.length > 0;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">
              My Papers
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Assigned papers are grouped by class. Your uploads stay below.
            </p>
          </div>
          <Button asChild className="gap-1">
            <Link href="/upload">
              <Plus className="h-4 w-4" />
              Upload paper
            </Link>
          </Button>
        </div>

        {loading && <p className="text-sm text-text-muted">Loading your papers...</p>}

        {error && <p className="text-sm text-danger">Error: {error}</p>}

        {!loading && !error && !hasAnyPaper && (
          <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No papers yet"
              description="Assigned papers from your classes and your own uploads will appear here."
            />
            <Link href="/upload" className="mt-3 inline-block text-sm font-medium text-text hover:underline">
              Upload your first paper
            </Link>
          </div>
        )}

        {assignedPapers.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Assigned papers</h2>
              <p className="text-sm text-text-muted">Sorted by class name.</p>
            </div>
            {Object.entries(assignedByClass).map(([className, papers]) => (
              <div key={className} className="space-y-3">
                <h3 className="rounded-md border border-border bg-surface-alt px-3 py-2 text-sm font-semibold text-text">
                  {className}
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  {papers.map((item) => (
                    <PaperCard
                      key={item.assignmentId}
                      paper={item.paper}
                      summary={item.summary}
                      meta={
                        <div className="text-sm text-text-muted">
                          <p className="font-medium text-text">{item.assignmentTitle}</p>
                          {item.dueDate ? (
                            <p className="text-xs">Due {new Date(item.dueDate).toLocaleDateString()}</p>
                          ) : null}
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {uploadedPapers.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Uploaded by you</h2>
              <p className="text-sm text-text-muted">Papers you added yourself.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {uploadedPapers.map(({ paper, summary }) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  summary={summary}
                  meta={
                    <p className="text-xs text-text-muted">
                      Uploaded {new Date(paper.created_at).toLocaleDateString()}
                    </p>
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
