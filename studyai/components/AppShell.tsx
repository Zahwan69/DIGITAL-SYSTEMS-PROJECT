"use client";

import { GraduationCap, Menu } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { Footer } from "@/components/Footer";
import { BRAND_NAME } from "@/lib/brand";
import type { AppRole } from "@/lib/nav-config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ProfileSummary = {
  username: string | null;
  full_name: string | null;
  xp: number | null;
  level: number | null;
};

const COLLAPSED_KEY = "studyai:sidebar-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "true";
  });

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLAPSED_KEY, String(desktopCollapsed));
  }, [desktopCollapsed]);

  const toggleDesktop = useCallback(() => {
    setDesktopCollapsed((current) => !current);
  }, []);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("role, username, full_name, xp, level")
      .eq("id", user.id)
      .single();
    setRole((data?.role ?? "student") as AppRole);
    setProfile({
      username: data?.username ?? null,
      full_name: data?.full_name ?? null,
      xp: data?.xp ?? null,
      level: data?.level ?? null,
    });
  }, []);

  // Ctrl/Cmd+B keyboard shortcut
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b" && !event.altKey) {
        event.preventDefault();
        toggleDesktop();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleDesktop]);

  useEffect(() => {
    void Promise.resolve().then(() => loadProfile());
  }, [loadProfile]);

  useEffect(() => {
    function refreshProfile() {
      void loadProfile();
    }
    window.addEventListener("studyai:profile-updated", refreshProfile);
    window.addEventListener("focus", refreshProfile);
    return () => {
      window.removeEventListener("studyai:profile-updated", refreshProfile);
      window.removeEventListener("focus", refreshProfile);
    };
  }, [loadProfile]);

  const home = role === "admin" ? "/admin/dashboard" : role === "teacher" ? "/teacher/dashboard" : "/dashboard";
  const collapsed = desktopCollapsed;

  return (
    <div className="flex min-h-dvh w-full bg-bg">
      <AppSidebar
        role={role}
        profile={profile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        desktopCollapsed={collapsed}
        onToggleDesktop={toggleDesktop}
      />
      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-1 flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-alt/80 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <Link href={home} className="flex items-center gap-2 text-text">
            <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            <span className="text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
          </Link>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
