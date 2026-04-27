"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Analytics = {
  perStudentTrajectory: Array<{ studentId: string; studentLabel: string; points: { date: string; percentage: number }[] }>;
  topicMastery: Array<{ topic: string; avgPercentage: number; attempts: number; classId: string; className: string }>;
  difficultyMix: Array<{ difficulty: string; count: number; avgPercentage: number }>;
  assignmentFunnel: Array<{
    assignmentId: string;
    title: string;
    assigned: number;
    attempted: number;
    completed: number;
  }>;
  engagement: Array<{ day: string; activeStudents: number; attempts: number }>;
  timeOfDay: Array<{ hour: number; attempts: number }>;
  classComparison: Array<{
    classId: string;
    className: string;
    avgPercentage: number | null;
    attempts: number;
    students: number;
  }>;
  cohortXp: Array<{ classId: string; className: string; xpLast30: number; xpPerStudent: number }>;
};

function heatOpacity(pct: number): string {
  if (pct >= 80) return "bg-accent text-text-on-accent";
  if (pct >= 60) return "bg-accent/90 text-text-on-accent";
  if (pct >= 40) return "bg-accent/60 text-text-on-accent";
  if (pct >= 20) return "bg-accent/35 text-text";
  return "bg-accent-soft text-accent";
}

function InsightsInner() {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject")?.trim() ?? "";
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/teacher/analytics${q}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load analytics.");
      setLoading(false);
      return;
    }
    setData(json as Analytics);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const hasAttempts = useMemo(() => {
    if (!data) return false;
    return (
      data.classComparison.some((c) => c.attempts > 0) ||
      data.difficultyMix.some((d) => d.count > 0) ||
      data.engagement.some((e) => e.attempts > 0)
    );
  }, [data]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <p className="text-sm text-danger">{error}</p>
      </AppShell>
    );
  }

  if (!data || !hasAttempts) {
    return (
      <AppShell>
        <div className="space-y-6">
          <h1 className="font-serif text-2xl font-semibold text-text">Analytics</h1>
          <EmptyState
            title="No attempts in this scope yet."
            description="When students submit answers on assigned papers, charts and tables will appear here."
          />
        </div>
      </AppShell>
    );
  }

  const heatTopics = [...new Set(data.topicMastery.map((t) => t.topic))].slice(0, 12);
  const heatClasses = [...new Set(data.topicMastery.map((t) => t.classId))];
  const heatCell = (topic: string, classId: string) => {
    const hit = data.topicMastery.find((t) => t.topic === topic && t.classId === classId);
    if (!hit) return { pct: null as number | null, n: 0 };
    return { pct: hit.avgPercentage, n: hit.attempts };
  };

  const funnelRows = data.assignmentFunnel.map((f) => ({
    ...f,
    pct: f.assigned ? Math.min(100, Math.round((f.completed / f.assigned) * 100)) : 0,
  }));

  const studentAvgBars = data.perStudentTrajectory.slice(0, 20).map((s) => {
    const pts = s.points;
    const avg =
      pts.length > 0 ? pts.reduce((a, p) => a + p.percentage, 0) / pts.length : 0;
    return { label: s.studentLabel, avg: Math.round(avg * 10) / 10 };
  });

  return (
    <AppShell>
      <div className="space-y-10">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-text-muted">Class performance, topics, engagement, and cohort XP.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Class comparison</CardTitle>
            <CardDescription>Average score (%) by class.</CardDescription>
          </CardHeader>
          <CardContent className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.classComparison.map((c) => ({
                  ...c,
                  avgPercentage: c.avgPercentage ?? 0,
                }))}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis
                  type="category"
                  dataKey="className"
                  width={100}
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Bar dataKey="avgPercentage" name="Avg %" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic mastery</CardTitle>
            <CardDescription>Heat by topic and class (avg %).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-border bg-surface-alt p-2 text-left text-text-muted">Topic</th>
                  {heatClasses.map((cid) => (
                    <th key={cid} className="border border-border bg-surface-alt p-2 text-text-muted">
                      {data.topicMastery.find((t) => t.classId === cid)?.className ?? cid.slice(0, 6)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatTopics.map((topic) => (
                  <tr key={topic}>
                    <td className="border border-border bg-surface p-2 font-medium text-text">{topic}</td>
                    {heatClasses.map((cid) => {
                      const { pct, n } = heatCell(topic, cid);
                      return (
                        <td key={cid} className="border border-border p-1 text-center">
                          <div
                            className={`rounded px-1 py-2 ${pct != null ? heatOpacity(pct) : "bg-surface-alt text-text-muted"}`}
                            title={pct != null ? `${pct}% · ${n} attempts` : "—"}
                          >
                            {pct != null ? `${Math.round(pct)}%` : "—"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-student average</CardTitle>
            <CardDescription>Up to 20 students with the most attempts; bar shows mean % across attempts.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentAvgBars} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip />
                <Bar dataKey="avg" name="Avg %" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difficulty mix</CardTitle>
            <CardDescription>Attempt counts by question difficulty.</CardDescription>
          </CardHeader>
          <CardContent className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.difficultyMix}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="difficulty" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} width={36} />
                <Tooltip
                  formatter={(value, name, item) => {
                    const count =
                      typeof value === "number"
                        ? value
                        : typeof value === "string"
                          ? Number(value)
                          : 0;
                    const safe = Number.isFinite(count) ? count : 0;
                    const payload = item?.payload as { avgPercentage?: number } | undefined;
                    if (name === "count") {
                      return [safe, "Attempts"];
                    }
                    return [`${payload?.avgPercentage ?? 0}% avg`, ""];
                  }}
                />
                <Bar dataKey="count" stackId="a" fill="var(--color-accent-soft)" name="count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment completion</CardTitle>
            <CardDescription>Assigned vs attempted vs completed (all questions).</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-2">Title</th>
                  <th className="py-2 tabular-nums">Assigned</th>
                  <th className="py-2 tabular-nums">Attempted</th>
                  <th className="py-2 tabular-nums">Completed</th>
                  <th className="py-2">Complete</th>
                </tr>
              </thead>
              <tbody>
                {funnelRows.map((f) => (
                  <tr key={f.assignmentId} className="border-b border-border">
                    <td className="py-2 font-medium text-text">{f.title}</td>
                    <td className="py-2 tabular-nums text-text-muted">{f.assigned}</td>
                    <td className="py-2 tabular-nums text-text-muted">{f.attempted}</td>
                    <td className="py-2 tabular-nums text-text-muted">{f.completed}</td>
                    <td className="py-2">
                      <div className="h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-border">
                        <div className="h-full bg-accent" style={{ width: `${f.pct}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement (28 days)</CardTitle>
            <CardDescription>Active students and attempts per day.</CardDescription>
          </CardHeader>
          <CardContent className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.engagement}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={32} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="activeStudents" name="Students" stroke="var(--color-accent)" dot={false} />
                <Line type="monotone" dataKey="attempts" name="Attempts" stroke="var(--color-success)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time of day</CardTitle>
            <CardDescription>Attempts by hour (UTC).</CardDescription>
          </CardHeader>
          <CardContent className="h-40 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.timeOfDay}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={28} />
                <Tooltip />
                <Bar dataKey="attempts" fill="var(--color-accent)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cohort XP (30 days)</CardTitle>
            <CardDescription>XP from attempts on assigned papers, per class.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <th className="py-2">Class</th>
                  <th className="py-2 tabular-nums">XP (30d)</th>
                  <th className="py-2 tabular-nums">XP / student</th>
                </tr>
              </thead>
              <tbody>
                {data.cohortXp.map((c) => (
                  <tr key={c.classId} className="border-b border-border">
                    <td className="py-2 text-text">{c.className}</td>
                    <td className="py-2 tabular-nums text-text-muted">{c.xpLast30}</td>
                    <td className="py-2 tabular-nums text-text-muted">{c.xpPerStudent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default function TeacherInsightsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <Skeleton className="h-10 w-48" />
        </AppShell>
      }
    >
      <InsightsInner />
    </Suspense>
  );
}
