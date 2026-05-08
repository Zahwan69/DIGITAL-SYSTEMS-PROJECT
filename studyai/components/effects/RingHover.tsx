"use client";

import * as React from "react";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { cn } from "@/lib/utils";

export function RingHover({
  children,
  className,
  disableMotion,
}: React.HTMLAttributes<HTMLDivElement> & { disableMotion?: boolean }) {
  const reducedMotion = useReducedMotion();
  const staticMode = disableMotion || reducedMotion;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface transition-colors",
        staticMode
          ? "hover:border-border-strong"
          : "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-border-strong hover:ring-1 hover:ring-[--color-border]",
        className
      )}
    >
      {children}
    </div>
  );
}
