"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function HoverBorderGradient({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <span className={cn("group inline-flex rounded-full border border-border bg-surface p-px transition-colors hover:border-border-strong", containerClassName)}>
      <span className={cn("inline-flex rounded-full bg-surface px-3 py-1.5 text-sm text-text transition-colors group-hover:bg-accent-soft", className)}>
        {children}
      </span>
    </span>
  );
}
