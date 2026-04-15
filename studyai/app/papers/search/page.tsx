"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Paper[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(false);

    const { data, error: fetchError } = await supabase
      .from("past_papers")
      .select("*")
      .ilike("syllabus_code", `%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setResults((data ?? []) as Paper[]);
    }

    setSearched(true);
    setLoading(false);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Search Papers</h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter syllabus code, e.g. 0580"
            className="max-w-sm"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>

        {error && <p className="text-sm text-red-700">Error: {error}</p>}

        {searched && results.length === 0 && (
          <p className="text-sm text-slate-500">
            No papers found for &quot;{query}&quot;. Try a different code or{" "}
            <Link href="/upload" className="text-indigo-600 hover:underline">
              upload one yourself
            </Link>
            .
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((paper) => (
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
