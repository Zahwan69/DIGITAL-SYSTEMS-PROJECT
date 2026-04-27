"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type OverviewClass = {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  member_count: number;
  assignment_count: number;
};

type SubjectOption = { id: string; name: string; syllabus_code: string | null };

const LINE_COLORS = ["#7B1E23", "#A85560", "#C0848C", "#D4A5A5", "#5C0F14", "#991B1B"];

function startMondayWeeks(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  for (let i = count - 1; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() - i * 7);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function TeacherDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subject")?.trim() || "";

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [kpis, setKpis] = useState({ activeStudents: 0, assignmentsThisWeek: 0, averageScore: null as number | null });
  const [chartRaw, setChartRaw] = useState<{ week: string; byClass: Record<string, number | null> }[]>([]);
  const [classes, setClasses] = useState<OverviewClass[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<
    Array<{
      id: string;
      percentage: number;
      created_at: string;
      studentLabel: string;
      questionId: string;
      paperId: string;
      className: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const loadSubjects = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/teacher/subjects", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) setSubjects(json.subjects ?? []);
  }, [getToken]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const q = subjectId ? `?subject=${encodeURIComponent(subjectId)}` : "";
    const res = await fetch(`/api/teacher/overview${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load overview.");
      setLoading(false);
      return;
    }
    setKpis(json.kpis);
    setChartRaw(json.chart ?? []);
    setClasses(json.classes ?? []);
    setRecentAttempts(json.recentAttempts ?? []);
    setLoading(false);
  }, [getToken, router, subjectId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadSubjects());
  }, [loadSubjects]);

  useEffect(() => {
    void Promise.resolve().then(() => loadOverview());
  }, [loadOverview]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setCreating(true);
    setCreateError(null);

    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const res = await fetch("/api/teacher/classes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: trimmed, subjectId: subjectId || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setCreateError(json.error ?? "Failed to create class.");
      setCreating(false);
      return;
    }

    setName("");
    setCreating(false);
    await loadOverview();
  }

  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);
  const classNames = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);

  const chartRows = useMemo(() => {
    const weeks = startMondayWeeks(12);
    return weeks.map((w) => {
      const row: Record<string, string | number | null> = {
        week: new Date(w + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        weekKey: w,
      };
      const hit = chartRaw.find((c) => c.week === w);
      for (const id of classIds) {
        row[id] = hit?.byClass[id] ?? null;
      }
      return row;
    });
  }, [chartRaw, classIds]);

  const hasChartData = chartRaw.some((c) => Object.values(c.byClass).some((v) => v != null));

  return (
    <AppShell>
      <div className="space-y-10">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            Teacher overview
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Class analytics and workload in one place — filter by subject to match how you teach.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Active students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-3xl font-semibold tabular-nums text-text">
                    {kpis.activeStudents}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Assignments this week</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-3xl font-semibold tabular-nums text-text">
                    {kpis.assignmentsThisWeek}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Average score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-3xl font-semibold tabular-nums text-text">
                    {kpis.averageScore != null ? `${kpis.averageScore}%` : "—"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Weekly average score by class (assigned papers).</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : !hasChartData ? (
              <div className="rounded-lg border border-border bg-surface-alt px-4 py-10 text-center text-sm text-text-muted">
                No data yet — your students haven&apos;t submitted any answers on assigned papers.
              </div>
            ) : (
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend formatter={(value) => classNames[value as string] ?? value} />
                    {classIds.map((id, idx) => (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        name={id}
                        stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create a class</CardTitle>
            <CardDescription>A unique join code is generated automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Year 11 Chemistry"
                className="max-w-sm"
                required
              />
              {subjects.length > 0 ? (
                <p className="w-full text-xs text-text-muted">
                  New class uses the subject selected in the sidebar ({subjectId ? "current filter" : "all — pick a subject in the sidebar to tag the class"}).
                </p>
              ) : null}
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create class"}
              </Button>
            </form>
            {createError && <p className="mt-2 text-sm text-danger">{createError}</p>}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-danger">Error: {error}</p>}

        <div>
          <h2 className="font-serif text-xl font-semibold text-text">Classes</h2>
          {!loading && !error && classes.length === 0 ? (
            <Card variant="muted" className="mt-4">
              <CardContent className="pt-6 text-sm text-text-muted">
                No classes in this scope yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
              {classes.map((cls) => (
                <li key={cls.id} className="hover:bg-accent-soft/40">
                  <Link href={`/teacher/classes/${cls.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <div>
                      <p className="font-medium text-text">{cls.name}</p>
                      <p className="text-xs text-text-muted">
                        Code <span className="font-mono font-semibold text-accent">{cls.join_code}</span>
                      </p>
                    </div>
                    <div className="flex gap-4 text-right text-xs tabular-nums text-text-muted">
                      <span>{cls.member_count} students</span>
                      <span>{cls.assignment_count} assignments</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent attempts</CardTitle>
            <CardDescription>Latest scores on assigned paper questions.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-text-muted">Loading…</p>
            ) : recentAttempts.length === 0 ? (
              <p className="text-sm text-text-muted">No attempts yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentAttempts.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-medium text-text">{a.studentLabel}</p>
                      <p className="text-xs text-text-muted">{a.className}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-text">{Math.round(a.percentage)}%</span>
                      <Link
                        href={`/papers/${a.paperId}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        View paper
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-text-muted">Loading…</p>
        </AppShell>
      }
    >
      <TeacherDashboardInner />
    </Suspense>
  );
}
