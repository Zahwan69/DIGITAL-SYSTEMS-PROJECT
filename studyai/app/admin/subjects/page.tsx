"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Subject = {
  id: string;
  name: string;
  syllabus_code: string | null;
  level: string | null;
};

export default function AdminSubjectsPage() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/admin/subjects", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (res.ok) setRows(json.subjects ?? []);
    else setError(json.error ?? "Failed");
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        syllabus_code: code.trim() || null,
        level: level.trim() || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Create failed");
      return;
    }
    setName("");
    setCode("");
    setLevel("");
    await load();
  }

  async function remove(id: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/admin/subjects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "Delete failed");
    await load();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold text-text">Subjects</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Card>
          <CardHeader>
            <CardTitle>Create subject</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-wrap gap-2" onSubmit={create}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Syllabus code" />
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Level" />
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-medium text-text">{s.name}</p>
                  <p className="text-xs text-text-muted">
                    {s.syllabus_code ?? "—"} · {s.level ?? "—"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void remove(s.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
