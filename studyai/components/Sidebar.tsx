"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AceternitySidebar } from "@/components/aceternity/sidebar";
import { BRAND_NAME } from "@/lib/brand";
import { navForRole, pathIsActive } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

type SidebarProps = {
  open: boolean;
  role: string | null;
  onClose: () => void;
};

export function Sidebar({ open, role, onClose }: SidebarProps) {
  const pathname = usePathname();
  const adminArea = pathname.startsWith("/admin");
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("adminSidebarExpanded") === "true";
  });
  const items = navForRole(role);

  useEffect(() => {
    localStorage.setItem("adminSidebarExpanded", String(expanded));
  }, [expanded]);

  if (role === "admin" && adminArea) {
    return (
      <div className="hidden lg:block">
        <AceternitySidebar expanded={expanded}>
          <button
            type="button"
            className="flex h-[72px] w-full cursor-pointer items-center gap-3 px-5 text-left text-text"
            onClick={() => setExpanded((value) => !value)}
            aria-label="Toggle navigation"
          >
            <GraduationCap className="h-6 w-6 shrink-0" strokeWidth={1.5} aria-hidden />
            <span className={cn("text-sm font-semibold transition-opacity", expanded ? "opacity-100" : "opacity-0")}>
              {BRAND_NAME}
            </span>
          </button>
          <nav aria-label="Admin" className="space-y-1 px-3">
            {items.map((item) => {
              const active = pathIsActive(pathname, item.pathMatch);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-muted transition-colors hover:border hover:border-border-strong",
                    active && "bg-accent text-text-on-accent hover:border-accent"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden />
                  <span className={cn("transition-opacity", expanded ? "opacity-100" : "sr-only opacity-0")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </AceternitySidebar>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className={cn("fixed inset-0 z-40 bg-text/20 lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
      />
      <aside
        id="app-sidebar-panel"
        aria-label="Primary navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface-alt transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          className="flex h-16 items-center gap-3 px-5 text-left text-text"
          onClick={onClose}
          aria-label="Toggle navigation"
        >
          <GraduationCap className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          <span className="text-sm font-semibold">{BRAND_NAME}</span>
        </button>
        <nav aria-label="Primary" className="space-y-1 px-3 py-3">
          {items.map((item) => {
            const active = pathIsActive(pathname, item.pathMatch);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-muted",
                  active && "bg-accent text-text-on-accent"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
