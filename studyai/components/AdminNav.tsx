"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, History, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/dashboard", pathMatch: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", pathMatch: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/papers", pathMatch: "/admin/papers", label: "Papers", icon: FileText },
  { href: "/admin/subjects", pathMatch: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/audit", pathMatch: "/admin/audit", label: "Audit log", icon: History },
] as const;

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      <p className="mb-2 flex items-center gap-2 px-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
        Admin
      </p>
      {items.map(({ href, pathMatch, label, icon: Icon }) => {
        const active = pathname === pathMatch || pathname.startsWith(`${pathMatch}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 border-l-2 border-transparent py-2 pl-[10px] pr-3 text-sm font-medium text-text transition-colors hover:bg-surface",
              active && "border-accent bg-surface text-accent"
            )}
          >
            <Icon className={cn("h-5 w-5 text-text-muted", active && "text-accent")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
