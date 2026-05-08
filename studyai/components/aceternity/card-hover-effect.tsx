import * as React from "react";

import { cn } from "@/lib/utils";

export function CardHoverEffect({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-border-strong hover:bg-surface-alt/60", className)}>
      {children}
    </div>
  );
}
