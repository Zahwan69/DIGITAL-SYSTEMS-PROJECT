"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, Flame, Plus, Search, Upload } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Hoverable, HoverableGroup } from "@/components/effects/Hoverable";
import { RingHover } from "@/components/effects/RingHover";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types/database";
import { supabase } from "@/lib/supabase";

type QuickAction = {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
};

type Assignment = {
  id: string;
  class_id: string;
  paper_id: string;
  title: string;
  instructions: string | null;
  due_date: string | null;
  class_name: string | null;
  paper: { subject_name: string; syllabus_code: string } | null;
};

type Invite = {
  id: string;
  class_id: string;
  class_name: string | null;
  status: "pending" | "accepted" | "declined";
  teacher: { username: string | null; full_name: string | null } | null;
};

const quickActions: QuickAction[] = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "Search Papers",
    description: "Find papers by syllabus code, year, and subject.",
    href: "/papers/search",
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Upload Paper",
    description: "Upload a past paper PDF and extract questions with AI.",
    href: "/upload",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "My Papers",
    description: "Review your uploaded papers and practice history.",
    href: "/papers",
  },
];

const xpRules = [
  "Answer a question (+10 XP)",
  "Get full marks (+25 XP)",
  "Complete a full paper (+100 XP)",
  "Reach a 3-day streak (+50 XP bonus)",
  "Reach a 7-day streak (+150 XP bonus)",
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{
    papersUploaded: number;
    questionsAttempted: number;
    bestScore: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [classroomLoading, setClassroomLoading] = useState(true);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const loadClassroom = useCallback(async () => {
    setClassroomLoading(true);
    const token = await getToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const [assignmentsRes, invitesRes] = await Promise.all([
      fetch("/api/student/assignments", { headers }),
      fetch("/api/student/invites", { headers }),
    ]);
    const [assignmentsJson, invitesJson] = await Promise.all([
      assignmentsRes.json(),
      invitesRes.json(),
    ]);
    if (assignmentsRes.ok) setAssignments(assignmentsJson.assignments ?? []);
    if (invitesRes.ok) setInvites(invitesJson.invites ?? []);
    setClassroomLoading(false);
  }, [getToken]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/auth/login");
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const [papersResult, attemptsCountResult, bestScoreResult] = await Promise.all([
        supabase
          .from("past_papers")
          .select("id", { count: "exact", head: true })
          .eq("uploaded_by", user.id),
        supabase
          .from("attempts")
          .select("question_id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("attempts")
          .select("percentage")
          .eq("user_id", user.id)
          .order("percentage", { ascending: false })
          .limit(1),
      ]);

      setStats({
        papersUploaded: papersResult.error ? 0 : papersResult.count ?? 0,
        questionsAttempted: attemptsCountResult.error ? 0 : attemptsCountResult.count ?? 0,
        bestScore:
          bestScoreResult.error || !bestScoreResult.data?.[0]
            ? null
            : bestScoreResult.data[0].percentage,
      });

      setProfile(profileData as Profile);
      setLoading(false);
      void loadClassroom();
    }
    void loadDashboard();
  }, [router, loadClassroom]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    setJoining(true);
    setJoinMessage(null);
    setJoinError(null);

    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const res = await fetch("/api/student/join-class", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ joinCode: code }),
    });
    const json = await res.json();
    setJoining(false);
    if (!res.ok) {
      setJoinError(json.error ?? "Failed to join class.");
      return;
    }
    setJoinCode("");
    setJoinMessage(
      json.alreadyMember
        ? `You're already in ${json.class.name}.`
        : `Joined ${json.class.name}!`
    );
    await loadClassroom();
  }

  async function respondToInvite(inviteId: string, action: "accept" | "decline") {
    setRespondingInviteId(inviteId);
    const token = await getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    const res = await fetch(`/api/student/invites/${inviteId}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });
    setRespondingInviteId(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setJoinError(json.error ?? "Failed to respond to invite.");
      return;
    }
    await loadClassroom();
  }

  const xp = profile?.xp ?? 0;
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const nextLevel = level + 1;
  const streak = profile?.study_streak ?? 0;
  const progressPercent = useMemo(
    () => Math.min((xpInLevel / 500) * 100, 100),
    [xpInLevel]
  );

  if (loading) {
    return (
      <AppShell>
        <Card>
          <CardContent className="pt-6 text-sm text-text-muted">Loading your dashboard…</CardContent>
        </Card>
      </AppShell>
    );
  }
  if (error) {
    return (
      <AppShell>
        <Card>
          <CardContent className="pt-6 text-sm text-danger">Error: {error}</CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-10">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Welcome back, {profile?.username || "there"}
        </h1>
        <p className="text-sm text-text-muted">
          {profile?.role === "teacher"
            ? "Your student tools live here; open Teacher overview in the sidebar when you’re running a class."
            : "Upload papers, get AI marking feedback, and join your teacher’s classes from this home."}
        </p>

        <Hoverable>
          <CardHeader>
            <CardTitle>Level {level}</CardTitle>
            <CardDescription>
              Total XP: <span className="font-semibold text-text">{xp}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-text-muted">
              {xpInLevel} / 500 XP to Level {nextLevel}
            </p>
            <p className="flex items-center gap-2 text-sm font-medium text-text">
              <Flame className="h-4 w-4 text-accent" aria-hidden />
              Study streak: {streak} day(s)
            </p>
          </CardContent>
        </Hoverable>

        {invites.length > 0 && (
          <Card variant="highlight">
            <CardHeader>
              <CardTitle className="text-base">Class invites ({invites.length})</CardTitle>
              <CardDescription>A teacher has invited you to join their class.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
                  >
                    <div>
                      <p className="font-medium text-text">{invite.class_name ?? "Class"}</p>
                      {invite.teacher && (
                        <p className="text-xs text-text-muted">
                          from{" "}
                          {invite.teacher.full_name ||
                            invite.teacher.username ||
                            "your teacher"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={respondingInviteId === invite.id}
                        onClick={() => respondToInvite(invite.id, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={respondingInviteId === invite.id}
                        onClick={() => respondToInvite(invite.id, "decline")}
                      >
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Join a class</CardTitle>
            <CardDescription>Enter the 6-character join code your teacher gave you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="flex flex-wrap gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="max-w-[160px] font-mono uppercase"
                maxLength={6}
              />
              <Button type="submit" disabled={joining}>
                {joining ? "Joining…" : "Join"}
              </Button>
            </form>
            {joinMessage && <p className="mt-2 text-sm text-success">{joinMessage}</p>}
            {joinError && <p className="mt-2 text-sm text-danger">{joinError}</p>}
          </CardContent>
        </Card>
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Papers uploaded",
              value: stats?.papersUploaded ?? 0,
              suffix: "",
            },
            {
              label: "Questions attempted",
              value: stats?.questionsAttempted ?? 0,
              suffix: "",
            },
            {
              label: "Best score",
              value: stats?.bestScore ?? null,
              suffix: "%",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold text-indigo-600">
                  {stat.value !== null ? `${stat.value}${stat.suffix}` : "—"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              My assignments
              {!classroomLoading ? ` (${assignments.length})` : ""}
            </CardTitle>
            <CardDescription>Papers your teachers have set for you.</CardDescription>
          </CardHeader>
          <CardContent>
            {classroomLoading ? (
              <p className="text-sm text-text-muted">Loading assignments…</p>
            ) : assignments.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No assignments yet"
                description="When a teacher adds you to a class, their paper assignments will show up here. Use the join code above if you have one."
              />
            ) : (
              <ul className="space-y-3">
                {assignments.map((a) => (
                  <RingHover key={a.id} className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-text">{a.title}</p>
                      <Link
                        href={`/papers/${a.paper_id}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Start →
                      </Link>
                    </div>
                    <p className="text-xs text-text-muted">
                      {a.class_name ?? "Class"}
                      {a.paper ? ` · ${a.paper.subject_name} (${a.paper.syllabus_code})` : ""}
                    </p>
                    {a.instructions && (
                      <p className="mt-1 text-sm text-text">{a.instructions}</p>
                    )}
                    {a.due_date && (
                      <p className="mt-1 text-xs text-text-muted">
                        Due {new Date(a.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </RingHover>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <HoverableGroup className="md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="block">
              <Hoverable className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-text-muted">{action.icon}</span>
                    {action.title}
                  </CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Hoverable>
            </Link>
          ))}
        </HoverableGroup>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-text-muted" aria-hidden />
              How to earn XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-text">
              {xpRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
