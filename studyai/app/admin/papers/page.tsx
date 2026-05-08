"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Paper = {
  id: string;
  subject_name: string;
  syllabus_code: string;
  year: number | null;
  question_count: number;
  created_at: string;
  uploader_username: string | null;
  uploader_full_name: string | null;
};

export default function AdminPapersPage() {
  const [rows, setRows] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [del, setDel] = useState<Paper | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/admin/papers?page=1&pageSize=50", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (res.ok) setRows(json.papers ?? []);
    else setError(json.error ?? "Failed to load");
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function confirmDelete() {
    if (!del) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/admin/papers/${del.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setDel(null);
    if (res.ok) await load();
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Delete failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold text-text">Papers</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                      <th className="py-2">Subject</th>
                      <th className="py-2">Syllabus</th>
                      <th className="py-2">Uploader</th>
                      <th className="py-2">Questions</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-b border-border">
                        <td className="py-2 text-text">{p.subject_name}</td>
                        <td className="py-2 text-text-muted">{p.syllabus_code}</td>
                        <td className="py-2 text-text-muted">
                          {p.uploader_full_name || p.uploader_username || "—"}
                        </td>
                        <td className="py-2 tabular-nums text-text-muted">{p.question_count}</td>
                        <td className="py-2">
                          <Button type="button" variant="destructive" size="sm" onClick={() => setDel(p)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete paper?</DialogTitle>
              <DialogDescription>This removes questions and attempts for this paper.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDel(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
