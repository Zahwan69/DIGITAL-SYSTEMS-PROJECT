"use client";

import Link from "next/link";
import { GraduationCap, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { HorizontalShellNav } from "@/components/HorizontalShellNav";
import { SignOutButton } from "@/components/SignOutButton";
import { SubjectSwitcher } from "@/components/SubjectSwitcher";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type NavbarProps = {
  role: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function Navbar({ role, sidebarOpen, onToggleSidebar }: NavbarProps) {
  const pathname = usePathname();
  const teacherSubjectBar = role === "teacher" && pathname.startsWith("/teacher");

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-stretch border-b border-border bg-surface md:px-6">
      <div className="flex w-11 shrink-0 items-center justify-center border-r border-border bg-surface-alt">
        <button
          type="button"
          className="flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-md text-text transition-colors duration-200 hover:bg-surface"
          onClick={onToggleSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar-panel"
          aria-label={sidebarOpen ? "Hide navigation panel" : "Show navigation panel"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" aria-hidden />
          ) : (
            <PanelLeftOpen className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 px-3 md:gap-3 md:px-0">
        <Link
          href="/dashboard"
          className="flex min-w-0 max-w-[min(52vw,14rem)] shrink-0 items-center gap-2 rounded-md outline-none ring-offset-2 ring-offset-surface transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent sm:max-w-xs md:max-w-sm"
        >
          <GraduationCap className="h-6 w-6 shrink-0 text-accent md:h-7 md:w-7" aria-hidden />
          <span className="min-w-0 leading-tight">
            <span className="font-serif text-base font-semibold text-text md:text-lg">{BRAND_NAME}</span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-wide text-text-muted sm:block">
              Teachers & students
            </span>
          </span>
        </Link>

        {teacherSubjectBar ? (
          <Suspense
            fallback={
              <div className="h-9 min-w-0 max-w-40 shrink animate-pulse rounded-md bg-surface-alt" aria-hidden />
            }
          >
            <div className="min-w-0 max-w-[min(12rem,42vw)] shrink sm:max-w-52 lg:max-w-60">
              <SubjectSwitcher />
            </div>
          </Suspense>
        ) : null}

        <div className="hidden min-w-0 flex-1 md:flex">
          <HorizontalShellNav role={role} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SignOutButton variant="icon" className="md:hidden" />
          {role ? (
            <span
              className={cn(
                "hidden rounded-full border border-border px-2 py-0.5 text-xs font-medium text-text-muted sm:inline-block",
                role === "teacher" && "border-accent-soft bg-accent-soft text-accent",
                role === "admin" && "border-border-strong bg-surface text-text"
              )}
            >
              {role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student"}
            </span>
          ) : null}
          <div className="hidden md:block">
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
