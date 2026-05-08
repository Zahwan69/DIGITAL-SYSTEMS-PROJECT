"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function MyPapersPage() {
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("past_papers")
        .select("*")
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPapers((data ?? []) as Paper[]);
      }
      setLoading(false);
    }

    void load();
  }, [router]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">My Papers</h1>
          <Button asChild className="gap-1">
            <Link href="/upload">
              <Plus className="h-4 w-4" />
              Upload paper
            </Link>
          </Button>
        </div>

        {loading && <p className="text-sm text-text-muted">Loading your papers…</p>}

        {error && <p className="text-sm text-danger">Error: {error}</p>}

        {!loading && !error && papers.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-text-muted">You haven&apos;t uploaded any papers yet.</p>
            <Link href="/upload" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
              Upload your first paper →
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`} className="block">
              <Card variant="interactive" className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">{paper.subject_name}</CardTitle>
                  <CardDescription>
                    {paper.syllabus_code}
                    {paper.year ? ` · ${paper.year}` : ""}
                    {" · "}
                    {paper.level}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted">
                    {paper.question_count} question{paper.question_count !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Uploaded {new Date(paper.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
