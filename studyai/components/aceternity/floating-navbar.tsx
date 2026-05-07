"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const items = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "/auth/login", label: "Sign in" },
];

export function FloatingNavbar() {
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const currentY = window.scrollY;
      setCompact(currentY > 200);
      setHidden(currentY > window.innerHeight * 0.7 && currentY > lastY);
      lastY = currentY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Public navigation"
      className={cn(
        "fixed left-1/2 top-4 z-50 flex h-14 -translate-x-1/2 items-center justify-between rounded-full border border-border bg-white/75 px-3 backdrop-blur-xl transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        compact ? "w-[min(92vw,640px)]" : "w-[min(92vw,720px)]",
        hidden ? "-translate-y-24 opacity-0" : "opacity-100"
      )}
    >
      <Link href="/" className="shrink-0 px-3 text-sm font-semibold tracking-tight text-text">
        {BRAND_NAME}
      </Link>
      <div className="hidden items-center gap-1 md:flex">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm text-text-muted transition-colors hover:text-text">
            {item.label}
          </Link>
        ))}
      </div>
      <Button asChild size="sm">
        <Link href="/auth/signup">Get started</Link>
      </Button>
    </nav>
  );
}
