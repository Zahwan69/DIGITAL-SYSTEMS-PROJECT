"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Role = "student" | "teacher" | "admin";
type DisplayRole = Role | "unassigned";

type UserRow = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: DisplayRole;
  xp: number;
  level: number;
  last_study_date: string | null;
  created_at: string;
  profile_missing: boolean;
};

const PAGE_SIZE = 25;
const ROLES: Role[] = ["student", "teacher", "admin"];

function roleBadgeClass(role: DisplayRole) {
  if (role === "admin") return "border-danger/30 bg-danger/10 text-danger";
  if (role === "teacher") return "border-accent/30 bg-accent-soft text-text";
  if (role === "unassigned") return "border-warning/30 bg-warning/10 text-text";
  return "border-border bg-surface-alt text-text-muted";
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<Role>("student");
  const [creating, setCreating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<{ user: UserRow; role: Role } | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const counts = useMemo(
    () => ({
      admin: users.filter((user) => user.role === "admin").length,
      teacher: users.filter((user) => user.role === "teacher").length,
      student: users.filter((user) => user.role === "student").length,
    }),
    [users]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Not signed in.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (q.trim()) params.set("q", q.trim());
    if (roleFilter) params.set("role", roleFilter);

    const res = await fetch(`/api/admin/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load users.");
      setLoading(false);
      return;
    }
    setUsers((json.users ?? []) as UserRow[]);
    setTotal(Number(json.total ?? 0));
    setLoading(false);
  }, [page, q, roleFilter]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Not signed in.");
      setCreating(false);
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: createEmail,
        fullName: createName,
        role: createRole,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to create user.");
      setCreating(false);
      return;
    }

    setCreateEmail("");
    setCreateName("");
    setCreateRole("student");
    setCreating(false);
    setPage(1);
    await load();
  }

  async function applyRole() {
    if (!pendingRole) return;
    setSavingRole(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Not signed in.");
      setSavingRole(false);
      return;
    }

    const res = await fetch(`/api/admin/users/${pendingRole.user.id}/role`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: pendingRole.role }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to update role.");
      setSavingRole(false);
      return;
    }

    setUsers((current) =>
      current.map((user) => (user.id === pendingRole.user.id ? { ...user, role: pendingRole.role } : user))
    );
    setSavingRole(false);
    setPendingRole(null);
  }

  async function deleteUser(user: UserRow) {
    if (user.id === currentUserId) {
      setError("You cannot delete your own account.");
      return;
    }
    if (user.role === "admin") {
      setError("Demote an admin before deleting the account.");
      return;
    }
    const label = user.full_name || user.email;
    if (!window.confirm(`Delete ${label}? This removes the auth user and related profile data.`)) return;

    setDeletingUserId(user.id);
    setError(null);
    const token = await getAccessToken();
    if (!token) {
      setError("Not signed in.");
      setDeletingUserId(null);
      return;
    }

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to delete user.");
      setDeletingUserId(null);
      return;
    }

    setDeletingUserId(null);
    await load();
  }

  const canGoNext = page * PAGE_SIZE < total;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-text sm:text-3xl">Users and roles</h1>
          <p className="mt-1 text-sm text-text-muted">
            Create demo accounts, update platform roles, and remove test users before final testing.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-muted">Auth users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-semibold tabular-nums">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-muted">Admins shown</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-semibold tabular-nums">{counts.admin}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-muted">Teachers shown</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-semibold tabular-nums">{counts.teacher}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-text-muted">Students shown</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl font-semibold tabular-nums">{counts.student}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" aria-hidden />
              Create test user
            </CardTitle>
            <CardDescription>Password defaults to the email address, matching the new seeder format.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-[1fr_1fr_12rem_auto]" onSubmit={handleCreate}>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Email</span>
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  placeholder="student27@studyai.test"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Name</span>
                <Input
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="Student27"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Role</span>
                <select
                  value={createRole}
                  onChange={(event) => setCreateRole(event.target.value as Role)}
                  className="h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button type="submit" disabled={creating} className="w-full lg:w-auto">
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>User directory</CardTitle>
                <CardDescription>Search is applied to the current auth page returned by Supabase.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={q}
                  onChange={(event) => {
                    setPage(1);
                    setQ(event.target.value);
                  }}
                  placeholder="Search email or name"
                  className="sm:w-64"
                />
                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setPage(1);
                    setRoleFilter(event.target.value);
                  }}
                  className="h-10 rounded-[10px] border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">All roles</option>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-14 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-muted">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="py-3 pr-4 font-medium">User</th>
                      <th className="py-3 pr-4 font-medium">Role</th>
                      <th className="py-3 pr-4 font-medium">Progress</th>
                      <th className="py-3 pr-4 font-medium">Last active</th>
                      <th className="py-3 pr-4 font-medium">Joined</th>
                      <th className="py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => {
                      const isSelf = user.id === currentUserId;
                      return (
                        <tr key={user.id}>
                          <td className="py-4 pr-4">
                            <div className="font-medium text-text">{user.full_name || user.username || "Unnamed"}</div>
                            <div className="text-xs text-text-muted">{user.email || "No email"}</div>
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(user.role)}`}
                            >
                              {user.role === "unassigned" ? "profile missing" : user.role}
                            </span>
                            {isSelf && <span className="ml-2 text-xs text-text-muted">You</span>}
                          </td>
                          <td className="py-4 pr-4 text-text-muted">
                            <span className="font-medium text-text">Level {user.level || 0}</span>
                            <span className="ml-2 tabular-nums">{user.xp || 0} XP</span>
                          </td>
                          <td className="py-4 pr-4 text-text-muted">{formatDate(user.last_study_date)}</td>
                          <td className="py-4 pr-4 text-text-muted">{formatDate(user.created_at)}</td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-2">
                              {ROLES.map((role) => (
                                <Button
                                  key={role}
                                  type="button"
                                  variant={role === user.role ? "secondary" : "outline"}
                                  size="sm"
                                  disabled={isSelf || role === user.role}
                                  onClick={() => setPendingRole({ user, role })}
                                >
                                  {role}
                                </Button>
                              ))}
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={isSelf || user.role === "admin" || deletingUserId === user.id}
                                onClick={() => void deleteUser(user)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                {deletingUserId === user.id ? "Deleting" : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                Page {page} of {Math.max(1, Math.ceil(Math.max(total, users.length) / PAGE_SIZE))}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canGoNext || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(pendingRole)} onOpenChange={(open) => !open && setPendingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update user role?</DialogTitle>
            <DialogDescription>
              {pendingRole
                ? `Change ${pendingRole.user.full_name || pendingRole.user.email} to ${pendingRole.role}?`
                : "Confirm the role change."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingRole(null)} disabled={savingRole}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyRole()} disabled={savingRole}>
              {savingRole ? "Saving..." : "Update role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
