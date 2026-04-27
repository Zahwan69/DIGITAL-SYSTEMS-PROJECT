"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Lightbulb,
  Search,
  ShieldCheck,
  Upload,
  Users,
  ClipboardList,
} from "lucide-react";

import { AdminNav } from "@/components/AdminNav";
import { cn } from "@/lib/utils";

type NavItem = { href: string; pathMatch: string; label: string; icon: React.ReactNode };

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const m = item.pathMatch;
  let active = pathname === m;
  if (!active && m === "/papers") {
    active = pathname.startsWith("/papers/") && !pathname.startsWith("/papers/search");
  }
  if (!active && m !== "/dashboard") {
    active = pathname.startsWith(`${m}/`);
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md py-2 pl-2 pr-2 text-sm font-medium text-text transition-colors hover:bg-surface",
        active && "bg-surface text-accent"
      )}
    >
      <span className={cn("text-text-muted", active && "text-accent")}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

const teacherNavConfig: Array<{
  base: string;
  label: string;
  icon: React.ReactNode;
}> = [
  { base: "/teacher/dashboard", label: "Overview", icon: <LayoutDashboard className="h-5 w-5" /> },
  { base: "/teacher/classes", label: "Classes", icon: <Users className="h-5 w-5" /> },
  { base: "/teacher/assignments", label: "Assignments", icon: <ClipboardList className="h-5 w-5" /> },
  { base: "/teacher/insights", label: "Analytics", icon: <Lightbulb className="h-5 w-5" /> },
];

function TeacherNavInner({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject")?.trim();
  const suffix = subject ? `?subject=${encodeURIComponent(subject)}` : "";

  const items: NavItem[] = teacherNavConfig.map((c) => ({
    href: `${c.base}${suffix}`,
    pathMatch: c.base,
    label: c.label,
    icon: c.icon,
  }));

  return (
    <>
      {items.map((item) => (
        <NavLink key={item.pathMatch} item={item} onNavigate={onNavigate} />
      ))}
    </>
  );
}

function TeacherNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-0.5">
      <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">Teaching</p>
      <Suspense
        fallback={<div className="h-9 rounded-md border border-border bg-surface px-2 py-2 text-xs text-text-muted">…</div>}
      >
        <TeacherNavInner onNavigate={onNavigate} />
      </Suspense>
    </div>
  );
}

function StudentNav({ onNavigate }: { onNavigate?: () => void }) {
  const items: NavItem[] = [
    {
      href: "/dashboard",
      pathMatch: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/papers",
      pathMatch: "/papers",
      label: "My Papers",
      icon: <BookOpen className="h-5 w-5" />,
    },
    { href: "/upload", pathMatch: "/upload", label: "Upload", icon: <Upload className="h-5 w-5" /> },
    {
      href: "/papers/search",
      pathMatch: "/papers/search",
      label: "Search",
      icon: <Search className="h-5 w-5" />,
    },
  ];

  return (
    <nav aria-label="Primary" className="space-y-0.5">
      {items.map((item) => (
        <NavLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

type SidebarProps = {
  open: boolean;
  role: string | null;
};

export function Sidebar({ open, role }: SidebarProps) {
  const pathname = usePathname();
  const teacherArea = pathname.startsWith("/teacher");
  const adminArea = pathname.startsWith("/admin");

  const showAdminNav = role === "admin" && adminArea;
  const showTeacherBlock = role === "teacher" && teacherArea && !adminArea;

  const panelNav = useMemo(
    () => (
      <>
        {showAdminNav ? <AdminNav /> : showTeacherBlock ? <TeacherNav /> : <StudentNav />}
        {role === "admin" && !adminArea ? (
          <div className="mt-6 border-t border-border pt-3">
            <Link
              href="/admin/dashboard"
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-text transition-colors hover:bg-surface"
            >
              <ShieldCheck className="h-5 w-5 text-text-muted" />
              Admin console
            </Link>
          </div>
        ) : null}
        {role === "teacher" && !teacherArea && !adminArea ? (
          <div className="mt-6 border-t border-border pt-3">
            <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">Teaching</p>
            <Link
              href="/teacher/dashboard"
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-text transition-colors hover:bg-surface"
            >
              <BarChart3 className="h-5 w-5 text-text-muted" />
              Teacher overview
            </Link>
          </div>
        ) : null}
      </>
    ),
    [adminArea, role, showAdminNav, showTeacherBlock, teacherArea]
  );

  return (
    <aside
      id="app-sidebar-panel"
      aria-label="Primary navigation"
      aria-hidden={!open}
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col self-stretch overflow-hidden border-r border-border bg-surface-alt transition-[width] duration-300 ease-in-out",
        open ? "w-56" : "w-0 border-transparent"
      )}
    >
      <div className="flex h-full min-h-0 w-56 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4">{panelNav}</div>
      </div>
    </aside>
  );
}
