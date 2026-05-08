"use client";

import * as React from "react";

import { useReducedMotion } from "@/components/aceternity/use-reduced-motion";
import { cn } from "@/lib/utils";

export function Hoverable({
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
          : "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-alt",
        className
      )}
    >
      {children}
    </div>
  );
}

export function HoverableGroup({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("group grid gap-4", className)}>{children}</div>;
}
