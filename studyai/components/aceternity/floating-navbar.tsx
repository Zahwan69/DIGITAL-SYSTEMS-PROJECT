"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const items = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/auth/login", label: "Sign in" },
];

export function FloatingNavbar() {
  const pathname = usePathname();
  const [scrollCompact, setScrollCompact] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrollCompact(y > 200);
      // Half past hero = scrolled past 50% of viewport height.
      setPastHero(y > window.innerHeight * 0.5);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Home: transparent above hero half-line, pill once scrolled past it.
  // Other pages: pill always.
  const homeAboveHero = isHome && !pastHero;

  return (
    <nav
      aria-label="Public navigation"
      className={cn(
        "fixed left-1/2 top-4 z-50 flex h-14 -translate-x-1/2 items-center justify-between rounded-full border px-3 text-black transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] dark:text-white",
        homeAboveHero
          ? "border-transparent bg-transparent"
          : "border-black bg-[--color-surface]/85 shadow-[0_8px_32px_rgba(10,10,10,0.08)] backdrop-blur-xl dark:border-border-strong dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
        scrollCompact ? "w-[min(92vw,640px)]" : "w-[min(92vw,720px)]"
      )}
    >
      <Link href="/" className="shrink-0 px-3 text-sm font-semibold tracking-tight">
        {BRAND_NAME}
      </Link>
      <div className="hidden items-center gap-1 md:flex">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-3 py-2 text-sm text-black transition-colors dark:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <ThemeToggle className="mx-1 hidden md:inline-flex" />
      <Button asChild size="sm">
        <Link href="/auth/signup">Get started</Link>
      </Button>
    </nav>
  );
}
