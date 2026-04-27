"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; role: "student" | "teacher" | "admin" } | null>(
    null
  );

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

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
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (debounced) params.set("q", debounced);
    if (roleFilter) params.set("role", roleFilter);
    const res = await fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load users.");
      setLoading(false);
      return;
    }
    setRows(json.users ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [debounced, page, roleFilter]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function applyRole(userId: string, role: "student" | "teacher" | "admin") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Role update failed.");
      return;
    }
    setDialogOpen(false);
    setPending(null);
    await load();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-semibold text-text">Users</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Card>
          <CardHeader>
            <CardTitle>Search &amp; filter</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <select
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text"
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
            >
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </CardContent>
        </Card>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                      <th className="py-2 pr-2">Email</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Role</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border">
                        <td className="py-2 pr-2 text-text">{r.email}</td>
                        <td className="py-2 pr-2 text-text-muted">{r.full_name || r.username || "—"}</td>
                        <td className="py-2 pr-2 capitalize text-text-muted">{r.role}</td>
                        <td className="flex flex-wrap gap-1 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPending({ id: r.id, role: "teacher" });
                              setDialogOpen(true);
                            }}
                          >
                            Teacher
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPending({ id: r.id, role: "admin" });
                              setDialogOpen(true);
                            }}
                          >
                            Admin
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPending({ id: r.id, role: "student" });
                              setDialogOpen(true);
                            }}
                          >
                            Student
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-text-muted">Total from auth: {total}</p>
            </CardContent>
          </Card>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change role?</DialogTitle>
              <DialogDescription>
                This will set the user&apos;s profile role to{" "}
                <span className="font-medium text-text">{pending?.role}</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => pending && void applyRole(pending.id, pending.role)}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
