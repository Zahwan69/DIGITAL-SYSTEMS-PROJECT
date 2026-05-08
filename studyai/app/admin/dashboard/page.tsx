"use client";

import { useCallback, useEffect, useState } from "react";
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
import { BentoGrid } from "@/components/aceternity/bento-grid";
import { Hoverable } from "@/components/effects/Hoverable";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Metrics = {
  totals: {
    users: number;
    teachers: number;
    admins: number;
    classes: number;
    papers: number;
    attempts: number;
  };
  series: { day: string; signups: number; attempts: number; papers: number }[];
  usage: { xpEarnedLast30Days: number };
  topTeachers: { teacherId: string; label: string; studentCount: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Metrics | null>(null);
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
    const res = await fetch("/api/admin/metrics", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load metrics.");
      setLoading(false);
      return;
    }
    setData(json as Metrics);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">Admin overview</h1>
          <p className="mt-1 text-sm text-text-muted">Platform totals and last 30 days of activity.</p>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {loading && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {!loading && data && (
          <>
            <BentoGrid className="md:grid-cols-4">
              <Hoverable>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-2xl font-semibold tabular-nums text-text">{data.totals.users}</p>
                </CardContent>
              </Hoverable>
              <Hoverable>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Teachers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-2xl font-semibold tabular-nums text-text">
                    {data.totals.teachers}
                  </p>
                </CardContent>
              </Hoverable>
              <Hoverable>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-2xl font-semibold tabular-nums text-text">
                    {data.totals.classes}
                  </p>
                </CardContent>
              </Hoverable>
              <Hoverable>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-text-muted">Papers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif text-2xl font-semibold tabular-nums text-text">
                    {data.totals.papers}
                  </p>
                </CardContent>
              </Hoverable>
            </BentoGrid>
            <SpotlightCard>
              <CardHeader>
                <CardTitle>Activity (30 days)</CardTitle>
                <CardDescription>Daily signups, attempts, and new papers.</CardDescription>
              </CardHeader>
              <CardContent className="h-72 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} width={36} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="signups" name="Signups" stroke="var(--color-accent)" dot={false} />
                    <Line type="monotone" dataKey="attempts" name="Attempts" stroke="var(--color-success)" dot={false} />
                    <Line type="monotone" dataKey="papers" name="Papers" stroke="var(--color-warning)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </SpotlightCard>
            <Card>
              <CardHeader>
                <CardTitle>Top teachers by class size</CardTitle>
                <CardDescription>Total students enrolled across all of each teacher&apos;s classes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                        <th className="py-2 pr-4">Teacher</th>
                        <th className="py-2 tabular-nums">Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topTeachers.map((t) => (
                        <tr key={t.teacherId} className="border-b border-border transition-colors hover:outline hover:outline-1 hover:outline-[--color-border-strong]">
                          <td className="py-2 pr-4 text-text">{t.label}</td>
                          <td className="py-2 tabular-nums text-text-muted">{t.studentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-text-muted">
                  XP earned (last 30d, all users):{" "}
                  <span className="font-medium text-text">{data.usage.xpEarnedLast30Days}</span>
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
