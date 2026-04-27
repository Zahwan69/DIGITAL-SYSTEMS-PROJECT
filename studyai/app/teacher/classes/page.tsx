"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type TeacherClass = {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  member_count: number;
};

function ClassesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject")?.trim() ?? "";
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push("/auth/login");
      return;
    }
    const res = await fetch(`/api/teacher/classes${q}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load classes.");
      setLoading(false);
      return;
    }
    setClasses(json.classes ?? []);
    setLoading(false);
  }, [q, router]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">Classes</h1>
          <p className="mt-1 text-sm text-text-muted">Open a class to manage assignments and members.</p>
        </div>
        {loading && <p className="text-sm text-text-muted">Loading…</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        {!loading && !error && classes.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No classes in this scope"
            description="Create a class from the overview or switch subject filter in the sidebar."
            action={
              <Button asChild variant="secondary">
                <Link href="/teacher/dashboard">Go to overview</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`} className="block">
                <Card variant="interactive" className="h-full">
                  <CardContent className="pt-5 sm:pt-6">
                    <p className="font-semibold text-text">{cls.name}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Join <span className="font-mono font-medium text-accent">{cls.join_code}</span>
                    </p>
                    <p className="mt-3 text-sm text-text-muted">
                      {cls.member_count} member{cls.member_count !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function TeacherClassesPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="text-sm text-text-muted">Loading…</p>
        </AppShell>
      }
    >
      <ClassesInner />
    </Suspense>
  );
}
