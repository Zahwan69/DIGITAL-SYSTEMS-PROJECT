"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database";
import { supabase } from "@/lib/supabase";
type QuickAction = {
  emoji: string;
  title: string;
  description: string;
  href: string;
};
const quickActions: QuickAction[] = [
  {
    emoji: "🔍",
    title: "Search Papers",
    description: "Find papers by syllabus code, year, and subject.",
    href: "/papers/search",
  },
  {
    emoji: "📤",
    title: "Upload Paper",
    description: "Upload a past paper PDF and extract questions with AI.",
    href: "/upload",
  },
  {
    emoji: "📚",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setProfile(profileData as Profile);
      setLoading(false);
    }
    void loadDashboard();
  }, [router]);
  const xp = profile?.xp ?? 0;
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const nextLevel = level + 1;
  const streak = profile?.study_streak ?? 0;
  const progressPercent = useMemo(() => Math.min((xpInLevel / 500) * 100, 100), [xpInLevel]);
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <Card>
            <CardContent className="pt-6 text-sm text-slate-600">Loading your dashboard...</CardContent>
          </Card>
        </main>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <Card>
            <CardContent className="pt-6 text-sm text-red-700">Error: {error}</CardContent>
          </Card>
        </main>
      </>
    );
  }
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Welcome back, {profile?.username || "Student"}! 👋
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Level {level}</CardTitle>
            <CardDescription>
              Total XP: <span className="font-semibold text-slate-800">{xp}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-slate-600">
              {xpInLevel} / 500 XP to Level {nextLevel}
            </p>
            <p className="text-sm font-medium text-slate-700">🔥 Study streak: {streak} day(s)</p>
          </CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="block">
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    {action.emoji} {action.title}
                  </CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
        <Card>
          <CardHeader>
            <CardTitle>How to earn XP</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
              {xpRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
