"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";

import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BRAND_NAME } from "@/lib/brand";
import { pathIsActive, type AppRole } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  pathMatch: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type ProfileSummary = {
  username?: string | null;
  full_name?: string | null;
  xp?: number | null;
  level?: number | null;
} | null;

function studyGroup(role: AppRole): NavGroup {
  const dashboardHref = role === "teacher" ? "/teacher/dashboard" : "/dashboard";
  const dashboardMatch = role === "teacher" ? "/teacher/dashboard" : "/dashboard";
  return {
    title: "Study",
    items: [
      { href: dashboardHref, pathMatch: dashboardMatch, label: "Dashboard", icon: LayoutDashboard },
      { href: "/papers", pathMatch: "/papers", label: "My Papers", icon: BookOpen },
      { href: "/upload", pathMatch: "/upload", label: "Upload QP/MS", icon: Upload },
    ],
  };
}

const TEACHING_GROUP: NavGroup = {
  title: "Teaching",
  items: [
    { href: "/teacher/chat", pathMatch: "/teacher/chat", label: "AI Chat", icon: Sparkles },
    { href: "/teacher/classes", pathMatch: "/teacher/classes", label: "Classes", icon: Users },
    { href: "/teacher/assignments", pathMatch: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
    { href: "/teacher/insights", pathMatch: "/teacher/insights", label: "Insights", icon: Lightbulb },
  ],
};

const ADMIN_GROUP: NavGroup = {
  title: "Admin",
  items: [
    { href: "/admin/dashboard", pathMatch: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", pathMatch: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/papers", pathMatch: "/admin/papers", label: "Papers", icon: FileText },
    { href: "/admin/subjects", pathMatch: "/admin/subjects", label: "Subjects", icon: BookOpen },
    { href: "/admin/audit", pathMatch: "/admin/audit", label: "Audit log", icon: History },
  ],
};

function buildGroups(role: AppRole): NavGroup[] {
  if (role === "admin") return [ADMIN_GROUP];
  if (role === "teacher") return [studyGroup("teacher"), TEACHING_GROUP];
  return [studyGroup("student")];
}

function homeForRole(role: AppRole) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  return "/dashboard";
}

type AppSidebarProps = {
  role: AppRole | null;
  profile: ProfileSummary;
  mobileOpen: boolean;
  onMobileClose: () => void;
  desktopCollapsed: boolean;
  onToggleDesktop: () => void;
};

export function AppSidebar({
  role,
  profile,
  mobileOpen,
  onMobileClose,
  desktopCollapsed,
  onToggleDesktop,
}: AppSidebarProps) {
  const pathname = usePathname();
  const groups = buildGroups((role ?? "student") as AppRole);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const home = homeForRole((role ?? "student") as AppRole);
  const displayName = profile?.full_name || profile?.username || "Account";
  const showXp = role === "student" || role === "teacher";

  // On mobile we always render at full width (drawer); collapsed only applies on lg+.
  const collapsedClass = desktopCollapsed ? "lg:w-16" : "lg:w-64";

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-40 bg-text/30 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Primary navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface-alt transition-[transform,width] duration-200 lg:translate-x-0",
          collapsedClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2 border-b border-border",
            desktopCollapsed ? "lg:justify-center lg:px-2" : "lg:px-4",
            "justify-between px-4"
          )}
        >
          <Link
            href={home}
            className={cn(
              "flex items-center gap-2 text-text",
              desktopCollapsed && "lg:justify-center"
            )}
            aria-label={BRAND_NAME}
          >
            <GraduationCap className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span
              className={cn(
                "text-sm font-semibold tracking-tight",
                desktopCollapsed && "lg:hidden"
              )}
            >
              {BRAND_NAME}
            </span>
          </Link>

          {/* Desktop collapse toggle — visible on lg+ */}
          <button
            type="button"
            onClick={onToggleDesktop}
            className={cn(
              "hidden h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text lg:inline-flex",
              desktopCollapsed && "lg:absolute lg:right-1 lg:top-1.5"
            )}
            aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={desktopCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          >
            {desktopCollapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden />
            )}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {profile && !desktopCollapsed ? (
          <div className="border-b border-border px-3 py-3 lg:block">
            <div className="rounded-md border border-border bg-surface px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-text">{displayName}</p>
              {showXp ? (
                <p className="text-xs text-text-muted">
                  Lvl {profile?.level ?? 1} · {profile?.xp ?? 0} XP
                </p>
              ) : (
                <p className="text-xs uppercase tracking-wide text-text-muted">{role}</p>
              )}
            </div>
          </div>
        ) : null}

        <nav
          className={cn(
            "flex-1 overflow-y-auto py-3",
            desktopCollapsed ? "lg:px-2" : "lg:px-3",
            "px-3"
          )}
        >
          {groups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              {desktopCollapsed ? (
                <div className="mb-1.5 hidden h-px bg-border first:hidden lg:block" />
              ) : (
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathIsActive(pathname, item.pathMatch);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={desktopCollapsed ? item.label : undefined}
                        className={cn(
                          "flex h-9 items-center gap-2.5 rounded-md text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text",
                          desktopCollapsed ? "lg:justify-center lg:px-0 px-2.5" : "px-2.5",
                          active && "bg-accent text-text-on-accent hover:bg-accent hover:text-text-on-accent"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                        <span className={cn("truncate", desktopCollapsed && "lg:sr-only")}>
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "shrink-0 border-t border-border py-3",
            desktopCollapsed ? "lg:px-2" : "lg:px-3",
            "px-3"
          )}
        >
          {desktopCollapsed ? (
            <div className="hidden flex-col items-center gap-2 lg:flex">
              <ThemeToggle />
              <SignOutButton variant="icon" />
            </div>
          ) : (
            <div className="hidden flex-col gap-2 lg:flex">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wider text-text-muted">Theme</span>
                <ThemeToggle />
              </div>
              <SignOutButton className="w-full justify-center" />
            </div>
          )}
          {/* Mobile footer (drawer) — always full-width regardless of collapsed state */}
          <div className="flex flex-col gap-2 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <SignOutButton className="w-full justify-center" />
          </div>
        </div>
      </aside>
    </>
  );
}
