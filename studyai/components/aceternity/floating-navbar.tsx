"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [scrollCompact, setScrollCompact] = useState(false);
  const navItems = authenticated ? navForRole(role) : publicItems;
  const isPublicActive = (href: string) => pathname === href || (href === "/" && pathname === "/");

  useEffect(() => {
    let frame = 0;

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollRoot = document.scrollingElement;
        const pageScroll = Math.max(
          window.scrollY,
          scrollRoot?.scrollTop ?? 0,
          document.documentElement.scrollTop,
          document.body.scrollTop
        );
        const shellScroll = document.getElementById("main-content")?.scrollTop ?? 0;
        const mainScroll = document.querySelector("main")?.scrollTop ?? 0;
        setScrollCompact(Math.max(pageScroll, shellScroll, mainScroll) > 160);
      });
    }

    const shellScroller = document.getElementById("main-content");
    const mainScroller = document.querySelector("main");
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    shellScroller?.addEventListener("scroll", onScroll, { passive: true });
    mainScroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
      shellScroller?.removeEventListener("scroll", onScroll);
      mainScroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      aria-label={authenticated ? "Primary navigation" : "Public navigation"}
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border-strong)",
        color: "var(--color-text)",
      }}
      className={cn(
        "fixed left-1/2 top-4 z-50 flex h-14 -translate-x-1/2 items-center justify-between rounded-full border px-3 text-[--color-text] shadow-[0_14px_42px_rgba(96,96,96,0.32)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] dark:shadow-[0_14px_42px_rgba(160,160,160,0.18)]",
        "ring-1 ring-[--color-bg]",
        scrollCompact ? "w-[min(94vw,760px)]" : "w-[min(94vw,980px)]"
      )}
    >
      <Link
        href={authenticated ? "/dashboard" : "/"}
        className="shrink-0 rounded-full border border-transparent px-3 py-2 text-sm font-semibold tracking-tight text-[--color-text] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[--color-border-strong] hover:bg-[--color-accent-soft]"
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
                "relative whitespace-nowrap rounded-full border border-transparent px-3 py-2 text-sm text-[--color-text] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-black/35 hover:bg-[--color-accent-soft] after:absolute after:bottom-1.5 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-[--color-text] after:opacity-0 after:transition-all after:duration-300 after:ease-[cubic-bezier(0.22,1,0.36,1)] hover:after:w-4 hover:after:opacity-30 dark:hover:border-white/35",
                active &&
                  "border-black bg-[--color-accent-soft] font-medium after:w-5 after:opacity-100 dark:border-white"
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
          <Button asChild size="sm">
            <Link href="/auth/signup">Get started</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
