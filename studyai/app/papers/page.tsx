"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Navbar } from "@/components/Navbar";
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
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">My Papers</h1>
          <Link
            href="/upload"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + Upload paper
          </Link>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading your papers...</p>}

        {error && <p className="text-sm text-red-700">Error: {error}</p>}

        {!loading && !error && papers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-500">You haven&apos;t uploaded any papers yet.</p>
            <Link
              href="/upload"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Upload your first paper →
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`} className="block">
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
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
                  <p className="text-sm text-slate-600">
                    {paper.question_count} question{paper.question_count !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Uploaded {new Date(paper.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
