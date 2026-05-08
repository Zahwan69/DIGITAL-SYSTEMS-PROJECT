"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function AceternitySidebar({
  expanded,
  children,
  className,
}: {
  expanded: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "h-full shrink-0 border-r border-border bg-surface-alt transition-[width] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        expanded ? "w-[248px]" : "w-[72px]",
        className
      )}
    >
      {children}
    </aside>
  );
}
