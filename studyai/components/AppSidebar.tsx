"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileText,
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
import { pathIsActive, type AppRole } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  pathMatch: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type ProfileSummary = {
  email?: string | null;
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

function profileInitial(profile: ProfileSummary) {
  const source = profile?.full_name || profile?.username || profile?.email || "A";
  return source.trim().charAt(0).toUpperCase() || "A";
}

function ProfileMenu({
  profile,
  role,
  collapsed,
  placement = "bottom",
}: {
  profile: ProfileSummary;
  role: AppRole | null;
  collapsed: boolean;
  placement?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const displayName = profile?.full_name || profile?.username || "Account";
  const email = profile?.email || "Signed in";
  const initial = profileInitial(profile);
  const showXp = role === "student" || role === "teacher";

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent | TouchEvent) {
      const node = wrapperRef.current;
      if (!node) return;
      if (e.target instanceof Node && !node.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      {open ? (
        <div
          className={cn(
            "absolute z-[70] w-72 rounded-lg border border-border bg-surface p-3 shadow-xl",
            placement === "top" ? "left-0 top-full mt-2" : "bottom-full left-0 mb-2",
            collapsed && "lg:left-full lg:ml-2",
            collapsed && placement === "top" && "lg:top-0 lg:mt-0",
            collapsed && placement === "bottom" && "lg:bottom-0 lg:mb-0"
          )}
        >
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-sm font-semibold text-text-on-accent">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{displayName}</p>
              <p className="truncate text-xs text-text-muted">{email}</p>
              {showXp ? (
                <p className="mt-1 text-xs text-text-muted">
                  Level {profile?.level ?? 1} / {profile?.xp ?? 0} XP
                </p>
              ) : (
                <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">{role ?? "student"}</p>
              )}
            </div>
          </div>

          <SignOutButton className="mt-3 w-full justify-center" onSignedOut={() => setOpen(false)} />

          <ThemeToggle variant="row" className="mt-3" />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-alt",
          collapsed &&
            "lg:justify-center lg:gap-0 lg:border-0 lg:bg-transparent lg:p-0 hover:lg:bg-transparent"
        )}
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-sm font-semibold text-text-on-accent",
            // When collapsed the wrapper button has no chrome, so the avatar
            // grows to fill the sidebar header square instead of looking
            // like a small dot inside an empty box.
            collapsed && "lg:h-11 lg:w-11 lg:rounded-xl"
          )}
        >
          {initial}
        </span>
        <span className={cn("min-w-0", collapsed && "lg:sr-only")}>
          <span className="block truncate text-sm font-semibold text-text">{displayName}</span>
          <span className="block truncate text-xs text-text-muted">{email}</span>
        </span>
      </button>
    </div>
  );
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
  const activeRole = (role ?? "student") as AppRole;
  const groups = buildGroups(activeRole);
  const collapsedClass = desktopCollapsed ? "lg:w-16" : "lg:w-64";

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!mobileOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) onMobileClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface-alt transition-transform duration-200 lg:translate-x-0",
          collapsedClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "relative flex h-14 shrink-0 items-center gap-2 border-b border-border",
            desktopCollapsed ? "lg:justify-center lg:px-2" : "lg:px-4",
            "justify-between px-4"
          )}
        >
          <div className={cn("min-w-0 flex-1", desktopCollapsed && "lg:flex-none")}>
            <ProfileMenu profile={profile} role={role} collapsed={desktopCollapsed} placement="top" />
          </div>

          <button
            type="button"
            onClick={onToggleDesktop}
            className={cn(
              "hidden items-center justify-center text-text-muted transition-colors hover:text-text lg:inline-flex",
              desktopCollapsed
                ? "lg:absolute lg:-right-5 lg:top-20 lg:z-[60] lg:h-10 lg:w-10 lg:rounded-lg lg:border lg:border-border lg:bg-surface lg:shadow-md hover:lg:bg-surface-alt"
                : "h-7 w-7 rounded-md hover:bg-surface"
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

          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-3", desktopCollapsed ? "lg:px-2" : "lg:px-3", "px-3")}>
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
                          desktopCollapsed ? "px-2.5 lg:justify-center lg:px-0" : "px-2.5",
                          active && "bg-accent text-text-on-accent hover:bg-accent hover:text-text-on-accent"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                        <span className={cn("truncate", desktopCollapsed && "lg:sr-only")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
