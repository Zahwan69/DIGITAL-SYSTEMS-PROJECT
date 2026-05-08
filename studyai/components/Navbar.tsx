"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BRAND_NAME } from "@/lib/brand";
import { navForRole, pathIsActive } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

type NavbarProps = {
  role: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function Navbar({ role, sidebarOpen, onToggleSidebar }: NavbarProps) {
  const pathname = usePathname();
  const adminArea = pathname.startsWith("/admin");
  const items = navForRole(role).filter((item) => (role === "admin" ? true : !item.href.startsWith("/admin")));

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center border-b border-border bg-surface px-3 lg:px-6">
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-text lg:hidden"
        onClick={onToggleSidebar}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar-panel"
        aria-label="Toggle navigation"
      >
        <GraduationCap className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </button>

      {!adminArea ? (
        <Link href="/dashboard" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-text lg:flex">
          <GraduationCap className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          {BRAND_NAME}
        </Link>
      ) : (
        <p className="hidden text-sm font-medium text-text-muted lg:block">
          {pathname.split("/").filter(Boolean).join(" / ") || "dashboard"}
        </p>
      )}

      {!adminArea ? (
        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex">
          {items.map((item) => {
            const active = pathIsActive(pathname, item.pathMatch);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex h-14 items-center px-3 text-sm font-medium text-text-muted transition-colors hover:text-text",
                  active && "text-text after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-accent"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {role ? (
          <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs font-medium capitalize text-text-muted">
            {role}
          </span>
        ) : null}
        <div className={cn(adminArea ? "block" : "hidden lg:block")}>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
