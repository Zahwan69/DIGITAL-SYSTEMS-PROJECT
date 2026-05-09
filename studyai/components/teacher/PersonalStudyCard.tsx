"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Flame, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type PersonalProfile = {
  username: string | null;
  full_name: string | null;
  xp: number;
  level: number;
  study_streak: number;
};

type RecentAttempt = {
  id: string;
  percentage: number;
  created_at: string;
  question_id: string;
  paper_id: string | null;
  paper_subject: string | null;
};

const QUICK_LINKS = [
  { href: "/upload", label: "Upload QP/MS", icon: Upload },
  { href: "/papers", label: "My papers", icon: BookOpen },
] as const;

export function PersonalStudyCard() {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [recent, setRecent] = useState<RecentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [profileRes, attemptsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, full_name, xp, level, study_streak")
          .eq("id", user.id)
          .single(),
        supabase
          .from("attempts")
          .select("id, percentage, created_at, question_id, questions(paper_id, past_papers(subject_name))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (profileRes.data) {
        setProfile({
          username: profileRes.data.username ?? null,
          full_name: profileRes.data.full_name ?? null,
          xp: Number(profileRes.data.xp ?? 0),
          level: Number(profileRes.data.level ?? 1),
          study_streak: Number(profileRes.data.study_streak ?? 0),
        });
      }

      if (attemptsRes.data) {
        const rows: RecentAttempt[] = attemptsRes.data.map((row) => {
          const rawQ = (row as { questions?: unknown }).questions;
          const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ) as
            | { paper_id?: string | null; past_papers?: unknown }
            | undefined;
          const rawPaper = q?.past_papers;
          const paper = (Array.isArray(rawPaper) ? rawPaper[0] : rawPaper) as
            | { subject_name?: string | null }
            | undefined;
          return {
            id: row.id,
            percentage: Number(row.percentage ?? 0),
            created_at: String(row.created_at),
            question_id: String(row.question_id),
            paper_id: q?.paper_id ?? null,
            paper_subject: paper?.subject_name ?? null,
          };
        });
        setRecent(rows);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const progress = useMemo(() => {
    const xp = profile?.xp ?? 0;
    return Math.min(100, Math.round(((xp % 500) / 500) * 100));
  }, [profile?.xp]);

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!profile) return null;

  const xpInLevel = profile.xp % 500;
  const nextLevel = profile.level + 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Your studying</CardTitle>
          <CardDescription>Your own progress as a learner on StudyAI.</CardDescription>
        </div>
        <span className="rounded-md border border-border bg-surface-alt px-2 py-1 text-xs font-medium text-text-muted">
          Lvl {profile.level}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
            <span>
              {xpInLevel} / 500 XP to Level {nextLevel}
            </span>
            <span className="inline-flex items-center gap-1 text-text">
              <Flame className="h-3.5 w-3.5 text-text" aria-hidden />
              {profile.study_streak}-day streak
            </span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="justify-start">
              <Link href={href}>
                <Icon className="mr-2 h-4 w-4" aria-hidden />
                {label}
              </Link>
            </Button>
          ))}
        </div>

        {recent.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Your recent attempts
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {recent.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <Link
                    href={attempt.paper_id ? `/papers/${attempt.paper_id}` : "/papers"}
                    className="truncate text-text hover:underline"
                  >
                    {attempt.paper_subject ?? "Past paper"}
                  </Link>
                  <span className="shrink-0 tabular-nums text-text-muted">
                    {attempt.percentage}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            No personal attempts yet. Try a question on one of your papers to track your own progress.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
