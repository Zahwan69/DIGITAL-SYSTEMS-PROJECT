"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "row";
};

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <span
        className={cn(
          variant === "row" ? "block h-16 w-full rounded-lg border border-transparent" : "h-9 w-9 rounded-lg border border-transparent",
          className
        )}
        aria-hidden
      />
    );
  }

  const dark = resolvedTheme === "dark";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "group text-text transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        variant === "row"
          ? "flex h-16 w-full items-center justify-between rounded-lg border border-border bg-surface-alt px-4 text-left hover:border-border-strong hover:bg-accent-soft hover:shadow-[0_8px_22px_rgba(10,10,10,0.10)] dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.35)]"
          : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-transparent hover:-translate-y-0.5 hover:border-border-strong hover:bg-accent-soft hover:shadow-[0_8px_22px_rgba(10,10,10,0.10)] dark:hover:shadow-[0_8px_22px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {variant === "row" ? <span className="text-sm font-semibold">Theme</span> : null}
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text",
          variant === "icon" && "border-transparent bg-transparent"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105",
            dark ? "group-hover:rotate-12" : "group-hover:-rotate-12"
          )}
          aria-hidden
        />
      </span>
    </button>
  );
}
