"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Entry = {
  id: string;
  actor_label: string;
  action: string;
  target_type: string;
  target_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/admin/audit", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (res.ok) setRows(json.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold text-text">Audit log</h1>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                      <th className="py-2">When</th>
                      <th className="py-2">Who</th>
                      <th className="py-2">Action</th>
                      <th className="py-2">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border">
                        <td className="py-2 text-text-muted">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 text-text">{r.actor_label}</td>
                        <td className="py-2 text-text">{r.action}</td>
                        <td className="py-2 text-text-muted">
                          {r.target_type} {r.target_id ? `· ${r.target_id.slice(0, 8)}…` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
