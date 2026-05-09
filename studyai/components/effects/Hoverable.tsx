import * as React from "react";

import { cn } from "@/lib/utils";

export function Hoverable({
  children,
  className,
  disableMotion,
}: React.HTMLAttributes<HTMLDivElement> & { disableMotion?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface transition-colors",
        disableMotion
          ? "hover:border-border-strong"
          : "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-border-strong hover:bg-surface-alt/60",
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
