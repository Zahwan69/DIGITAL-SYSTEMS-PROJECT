"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";
import { navForRole, pathIsActive } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

const publicItems = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/auth/login", label: "Sign in" },
];

type FloatingNavbarProps = {
  role?: string | null;
  authenticated?: boolean;
};

export function FloatingNavbar({ role = null, authenticated = false }: FloatingNavbarProps) {
  const pathname = usePathname();
  const navItems = authenticated ? navForRole(role) : publicItems;
  const isPublicActive = (href: string) => pathname === href || (href === "/" && pathname === "/");

  return (
    <nav
      aria-label={authenticated ? "Primary navigation" : "Public navigation"}
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border-strong)",
        color: "var(--color-text)",
      }}
      className="fixed left-1/2 top-4 z-50 flex h-14 w-[min(94vw,980px)] -translate-x-1/2 items-center justify-between rounded-full border px-3 text-[--color-text] shadow-[0_14px_42px_rgba(96,96,96,0.22)] ring-1 ring-[--color-bg] dark:shadow-[0_14px_42px_rgba(160,160,160,0.12)]"
    >
      <Link
        href={authenticated ? "/dashboard" : "/"}
        className="shrink-0 rounded-full border border-transparent px-3 py-2 text-sm font-semibold tracking-tight text-[--color-text] transition-colors hover:border-[--color-border-strong] hover:bg-[--color-accent-soft]"
      >
        {BRAND_NAME}
      </Link>
      <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex">
        {navItems.map((item) => {
          const active =
            authenticated && "pathMatch" in item
              ? pathIsActive(pathname, item.pathMatch)
              : isPublicActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative whitespace-nowrap rounded-full border border-transparent px-3 py-2 text-sm text-[--color-text] transition-colors hover:border-black/35 hover:bg-[--color-accent-soft] dark:hover:border-white/35",
                active && "border-black bg-[--color-accent-soft] font-medium dark:border-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle className="mx-1 hidden sm:inline-flex" />
        {authenticated ? (
          <>
            {role ? (
              <span className="hidden rounded-full border border-[--color-border] bg-[--color-surface-alt] px-2.5 py-1 text-xs font-medium capitalize text-[--color-text-muted] sm:inline-flex">
                {role}
              </span>
            ) : null}
            <SignOutButton variant="icon" />
          </>
        ) : (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-neutral-950/30 bg-transparent text-neutral-950 hover:bg-neutral-950/5 hover:border-neutral-950 hover:ring-neutral-950 dark:border-white/30 dark:text-white dark:hover:bg-white/5 dark:hover:border-white dark:hover:ring-white"
          >
            <Link href="/auth/signup">Get started</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
