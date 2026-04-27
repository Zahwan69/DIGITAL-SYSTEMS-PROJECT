"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Lightbulb,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

function hrefActive(pathname: string, pathMatch: string): boolean {
  let active = pathname === pathMatch;
  if (!active && pathMatch === "/papers") {
    active = pathname.startsWith("/papers/") && !pathname.startsWith("/papers/search");
  }
  if (!active && pathMatch !== "/dashboard") {
    active = pathname.startsWith(`${pathMatch}/`);
  }
  return active;
}

function HLink({
  href,
  pathMatch,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  pathMatch: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = hrefActive(pathname, pathMatch);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt hover:text-text",
        active && "bg-accent-soft/60 text-accent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      {label}
    </Link>
  );
}

function TeacherHNavInner({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject")?.trim();
  const suffix = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  const bases = [
    { base: "/teacher/dashboard", label: "Overview", icon: LayoutDashboard },
    { base: "/teacher/classes", label: "Classes", icon: Users },
    { base: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
    { base: "/teacher/insights", label: "Analytics", icon: Lightbulb },
  ] as const;
  return (
    <>
      {bases.map(({ base, label, icon }) => (
        <HLink key={base} href={`${base}${suffix}`} pathMatch={base} label={label} icon={icon} onNavigate={onNavigate} />
      ))}
    </>
  );
}

const adminBases = [
  { href: "/admin/dashboard", pathMatch: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", pathMatch: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/papers", pathMatch: "/admin/papers", label: "Papers", icon: FileText },
  { href: "/admin/subjects", pathMatch: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/audit", pathMatch: "/admin/audit", label: "Audit", icon: History },
] as const;

const studentItems = [
  { href: "/dashboard", pathMatch: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/papers", pathMatch: "/papers", label: "Papers", icon: BookOpen },
  { href: "/upload", pathMatch: "/upload", label: "Upload", icon: Upload },
  { href: "/papers/search", pathMatch: "/papers/search", label: "Search", icon: Search },
] as const;

type HorizontalShellNavProps = {
  role: string | null;
  onNavigate?: () => void;
  className?: string;
};

export function HorizontalShellNav({ role, onNavigate, className }: HorizontalShellNavProps) {
  const pathname = usePathname();
  const teacherArea = pathname.startsWith("/teacher");
  const adminArea = pathname.startsWith("/admin");

  const showAdminNav = role === "admin" && adminArea;
  const showTeacherBlock = role === "teacher" && teacherArea && !adminArea;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex min-w-0 max-w-full flex-1 items-center gap-0.5 overflow-x-auto px-1 md:justify-start md:px-2",
        className
      )}
    >
      {showAdminNav ? (
        <>
          {adminBases.map(({ href, pathMatch, label, icon }) => (
            <HLink key={href} href={href} pathMatch={pathMatch} label={label} icon={icon} onNavigate={onNavigate} />
          ))}
        </>
      ) : showTeacherBlock ? (
        <Suspense fallback={<span className="px-2 text-xs text-text-muted">Loading…</span>}>
          <TeacherHNavInner onNavigate={onNavigate} />
        </Suspense>
      ) : (
        <>
          {studentItems.map(({ href, pathMatch, label, icon }) => (
            <HLink key={href} href={href} pathMatch={pathMatch} label={label} icon={icon} onNavigate={onNavigate} />
          ))}
        </>
      )}

      {role === "admin" && !adminArea ? (
        <HLink href="/admin/dashboard" pathMatch="/admin/dashboard" label="Admin" icon={ShieldCheck} onNavigate={onNavigate} />
      ) : null}
      {role === "teacher" && !teacherArea && !adminArea ? (
        <HLink href="/teacher/dashboard" pathMatch="/teacher/dashboard" label="Teaching" icon={BarChart3} onNavigate={onNavigate} />
      ) : null}
    </nav>
  );
}
