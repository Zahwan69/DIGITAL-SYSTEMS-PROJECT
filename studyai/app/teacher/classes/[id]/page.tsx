"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

type ClassSummary = {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  subject_id?: string | null;
};

type Member = {
  id: string;
  student_id: string;
  joined_at: string;
  username: string | null;
  full_name: string | null;
};

type Assignment = {
  id: string;
  paper_id: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
  created_at: string;
  paper: { subject_name: string; syllabus_code: string } | null;
};

type Invite = {
  id: string;
  student_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  username: string | null;
  full_name: string | null;
};

type PaperOption = {
  id: string;
  subject_name: string;
  syllabus_code: string;
};

type SubjectOption = {
  id: string;
  name: string;
  syllabus_code: string | null;
};

type StudentResult = {
  id: string;
  username: string | null;
  full_name: string | null;
};

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [classInfo, setClassInfo] = useState<ClassSummary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [papers, setPapers] = useState<PaperOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editClassName, setEditClassName] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [updatingClass, setUpdatingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);
  const [classSettingsError, setClassSettingsError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [paperId, setPaperId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const [classRes, membersRes, assignmentsRes, invitesRes, subjectsRes] = await Promise.all([
      fetch(`/api/teacher/classes/${id}`, { headers }),
      fetch(`/api/teacher/classes/${id}/members`, { headers }),
      fetch(`/api/teacher/classes/${id}/assignments`, { headers }),
      fetch(`/api/teacher/classes/${id}/invites`, { headers }),
      fetch("/api/teacher/subjects", { headers }),
    ]);

    const [classJson, membersJson, assignmentsJson, invitesJson, subjectsJson] = await Promise.all([
      classRes.json().catch(() => ({})),
      membersRes.json().catch(() => ({})),
      assignmentsRes.json().catch(() => ({})),
      invitesRes.json().catch(() => ({})),
      subjectsRes.json().catch(() => ({})),
    ]);

    if (!classRes.ok) {
      setError(classJson.error ?? "Class not found or not owned by you.");
      setLoading(false);
      return;
    }
    if (!membersRes.ok) {
      setError(membersJson.error ?? "Failed to load members.");
      setLoading(false);
      return;
    }
    if (!assignmentsRes.ok) {
      setError(assignmentsJson.error ?? "Failed to load assignments.");
      setLoading(false);
      return;
    }
    if (!invitesRes.ok) {
      setError(invitesJson.error ?? "Failed to load invites.");
      setLoading(false);
      return;
    }

    const nextClass = classJson.class as ClassSummary;
    setClassInfo(nextClass);
    setEditClassName(nextClass.name);
    setEditSubjectId(nextClass.subject_id ?? "");
    setMembers(membersJson.members ?? []);
    setAssignments(assignmentsJson.assignments ?? []);
    setInvites(invitesJson.invites ?? []);
    setSubjects(subjectsRes.ok ? subjectsJson.subjects ?? [] : []);

    const { data: papersData } = await supabase
      .from("past_papers")
      .select("id, subject_name, syllabus_code")
      .order("created_at", { ascending: false })
      .limit(100);
    setPapers((papersData ?? []) as PaperOption[]);

    setLoading(false);
  }, [id, getToken, router]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function handleCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !paperId) return;

    setCreatingAssignment(true);
    setAssignmentError(null);

    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const res = await fetch(`/api/teacher/classes/${id}/assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        paperId,
        instructions: instructions.trim() || undefined,
        dueDate: dueDate || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setAssignmentError(json.error ?? "Failed to create assignment.");
      setCreatingAssignment(false);
      return;
    }

    setTitle("");
    setPaperId("");
    setInstructions("");
    setDueDate("");
    setCreatingAssignment(false);
    await load();
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = search.trim();
    if (q.length < 2) return;

    setSearching(true);
    setInviteError(null);

    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const res = await fetch(
      `/api/teacher/search-students?q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    setSearching(false);
    if (!res.ok) {
      setInviteError(json.error ?? "Search failed.");
      return;
    }
    setSearchResults(json.students ?? []);
  }

  async function handleInvite(studentId: string) {
    setInvitingId(studentId);
    setInviteError(null);

    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const res = await fetch(`/api/teacher/classes/${id}/invites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId }),
    });
    const json = await res.json();
    setInvitingId(null);
    if (!res.ok) {
      setInviteError(json.error ?? "Failed to send invite.");
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-text-muted">Loading class…</p>
      </AppShell>
    );
  }

  if (error || !classInfo) {
    return (
      <AppShell>
        <p className="text-sm text-danger">{error ?? "Something went wrong."}</p>
        <Link
          href="/teacher/dashboard"
          className="mt-2 inline-block text-sm text-text hover:underline"
        >
          ← Back to teacher dashboard
        </Link>
      </AppShell>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link href="/teacher/dashboard" className="text-sm text-text hover:underline">
            ← Teacher dashboard
          </Link>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-text sm:text-3xl">
            {classInfo.name}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Join code:{" "}
            <span className="font-mono font-semibold text-text">{classInfo.join_code}</span> ·{" "}
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create assignment</CardTitle>
            <CardDescription>
              Assign an existing paper, or upload a new QP/MS first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Assignment title"
                required
              />
              <select
                id="paperId"
                value={paperId}
                onChange={(e) => setPaperId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                required
              >
                <option value="">Select a past paper...</option>
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.subject_name} — {p.syllabus_code}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-text-muted">
                  {papers.length === 0
                    ? "No uploaded papers yet. Upload a QP/MS first, then come back to assign it."
                    : "Need a new paper for this class?"}
                </p>
                <Link
                  href={`/upload?returnTo=${encodeURIComponent(`/teacher/classes/${id}`)}`}
                  className="text-xs font-medium text-text underline hover:text-text-muted"
                >
                  Upload QP/MS
                </Link>
              </div>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions (optional)"
                rows={3}
              />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Button type="submit" disabled={creatingAssignment}>
                {creatingAssignment ? "Creating..." : "Create assignment"}
              </Button>
              {assignmentError && (
                <p className="text-sm text-danger">{assignmentError}</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Assignments ({assignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-text-muted">No assignments yet.</p>
            ) : (
              <ul className="space-y-3">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-text">{a.title}</p>
                      <Link
                        href={`/papers/${a.paper_id}`}
                        className="text-xs font-medium text-text hover:underline"
                      >
                        Open paper →
                      </Link>
                    </div>
                    {a.paper && (
                      <p className="text-xs text-text-muted">
                        {a.paper.subject_name} — {a.paper.syllabus_code}
                      </p>
                    )}
                    {a.instructions && (
                      <p className="mt-1 text-sm text-text">{a.instructions}</p>
                    )}
                    {a.due_date && (
                      <p className="mt-1 text-xs text-text-muted">
                        Due {new Date(a.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite students</CardTitle>
            <CardDescription>
              Search by username or name, then send an invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students (min 2 characters)"
                className="max-w-sm"
              />
              <Button type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </Button>
            </form>

            {inviteError && <p className="text-sm text-danger">{inviteError}</p>}

            {searchResults.length > 0 && (
              <ul className="space-y-2">
                {searchResults.map((s) => {
                  const isMember = members.some((m) => m.student_id === s.id);
                  const isInvited = pendingInvites.some(
                    (i) => i.student_id === s.id
                  );
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface p-2"
                    >
                      <span className="text-sm text-text">
                        {s.full_name || s.username || "Unnamed student"}
                        {s.username && (
                          <span className="ml-2 text-xs text-text-muted">@{s.username}</span>
                        )}
                      </span>
                      {isMember ? (
                        <span className="text-xs text-text-muted">Member</span>
                      ) : isInvited ? (
                        <span className="text-xs text-warning">Invite pending</span>
                      ) : (
                        <Button
                          type="button"
                          disabled={invitingId === s.id}
                          onClick={() => handleInvite(s.id)}
                        >
                          {invitingId === s.id ? "Sending..." : "Invite"}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {pendingInvites.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text">
                  Pending invites ({pendingInvites.length})
                </p>
                <ul className="mt-2 space-y-1 text-sm text-text-muted">
                  {pendingInvites.map((i) => (
                    <li key={i.id}>
                      {i.full_name || i.username || i.student_id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-text-muted">
                No students yet. Share the join code or send invites above.
              </p>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface p-2"
                  >
                    <span className="text-sm text-text">
                      {m.full_name || m.username || "Unnamed student"}
                      {m.username && (
                        <span className="ml-2 text-xs text-text-muted">@{m.username}</span>
                      )}
                    </span>
                    <span className="text-xs text-text-muted">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
